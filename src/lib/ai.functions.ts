import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IngredientSchema = z.object({
  name: z.string().min(1).max(80),
  quantity: z.string().max(40).optional().default(""),
  category: z.string().max(40).optional().default("Other"),
});

const GeneratedMealSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(400).optional().default(""),
  instructions: z.string().max(2000).optional().default(""),
  calories: z.number().int().min(50).max(3000).optional().default(500),
  prep_minutes: z.number().int().min(1).max(360).optional().default(20),
  tags: z.array(z.string().max(30)).max(8).optional().default([]),
  meal_type: z.enum(["breakfast", "lunch", "dinner"]),
  ingredients: z.array(IngredientSchema).min(1).max(25),
});

const PlanDaySchema = z.object({
  day: z.string(),
  breakfast: GeneratedMealSchema.optional(),
  lunch: GeneratedMealSchema.optional(),
  dinner: GeneratedMealSchema.optional(),
});

const PlanResponseSchema = z.object({
  week: z.array(PlanDaySchema).length(7),
});

function startOfWeekISO(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getUTCDay();
  const diff = (day + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const generateWeeklyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      extra_notes: z.string().max(400).optional().default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OpenRouter API key is not configured.");

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    const sys = `You are a meal-planning chef. Output ONLY valid JSON matching this exact TypeScript type:
{ "week": Array<{ "day": string, "breakfast": Meal, "lunch": Meal, "dinner": Meal }> } where Meal is
{ "title": string, "description": string, "instructions": string, "calories": number, "prep_minutes": number, "tags": string[], "meal_type": "breakfast"|"lunch"|"dinner", "ingredients": Array<{ "name": string, "quantity": string, "category": string }> }.
The "week" array must have exactly 7 entries with "day" values: ${DAYS.join(", ")}.
Group ingredient categories into: Produce, Protein, Dairy, Pantry, Frozen, Bakery, Other.`;

    const diet = profile?.dietary_preferences?.length ? profile.dietary_preferences.join(", ") : "no preference";
    const allergies = profile?.allergies?.length ? profile.allergies.join(", ") : "none";
    const household = profile?.household_size ?? 2;
    const calories = profile?.daily_calories ?? 2000;

    const user = `Plan a balanced, varied 7-day meal plan.
Dietary preferences: ${diet}
Allergies/restrictions to AVOID: ${allergies}
Household size: ${household}
Daily calorie target (across breakfast+lunch+dinner): ~${calories} kcal
Extra notes: ${data.extra_notes || "none"}
Use ingredients that overlap across meals when possible to simplify shopping. Keep prep simple (under 45 minutes per meal).`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://prepbowl.lovable.app",
        "X-Title": "Prepbowl",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenRouter error (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON. Try again.");
    }
    const validated = PlanResponseSchema.parse(parsed);

    // Insert meals and build plan structure
    const planRows: Array<Record<string, string | null>> = [];
    for (const day of validated.week) {
      const row: Record<string, string | null> = { day: day.day };
      for (const slot of ["breakfast", "lunch", "dinner"] as const) {
        const meal = day[slot];
        if (!meal) { row[`${slot}_meal_id`] = null; continue; }
        const { data: inserted, error } = await supabase
          .from("meals")
          .insert({
            user_id: userId,
            title: meal.title,
            description: meal.description,
            instructions: meal.instructions,
            calories: meal.calories,
            prep_minutes: meal.prep_minutes,
            tags: meal.tags,
            meal_type: meal.meal_type,
            ingredients: meal.ingredients,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        row[`${slot}_meal_id`] = inserted!.id;
      }
      planRows.push(row);
    }

    const week_start = startOfWeekISO();
    const { error: upErr } = await supabase
      .from("meal_plans")
      .upsert({ user_id: userId, week_start, plan: planRows }, { onConflict: "user_id,week_start" });
    if (upErr) throw new Error(upErr.message);

    return { ok: true, week_start };
  });
