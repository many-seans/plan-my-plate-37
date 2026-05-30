import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function startOfWeekISO(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // make Monday=0
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

export const getCurrentPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const week_start = startOfWeekISO();
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", week_start)
      .maybeSingle();

    if (!plan) return { plan: null, meals: [], week_start };

    // collect meal_ids
    const ids = new Set<string>();
    const planArr = (plan.plan as Array<Record<string, string | null>>) ?? [];
    for (const day of planArr) {
      for (const k of ["breakfast_meal_id", "lunch_meal_id", "dinner_meal_id"]) {
        const v = day[k];
        if (v) ids.add(v);
      }
    }
    let meals: any[] = [];
    if (ids.size) {
      const { data } = await supabase.from("meals").select("*").in("id", Array.from(ids));
      meals = data ?? [];
    }
    return { plan, meals, week_start };
  });

export const getShoppingList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const week_start = startOfWeekISO();
    const { data: plan } = await supabase
      .from("meal_plans").select("plan").eq("user_id", userId).eq("week_start", week_start).maybeSingle();
    if (!plan) return { items: [] };
    const ids = new Set<string>();
    for (const day of (plan.plan as any[]) ?? []) {
      for (const k of ["breakfast_meal_id", "lunch_meal_id", "dinner_meal_id"]) {
        if (day[k]) ids.add(day[k]);
      }
    }
    if (!ids.size) return { items: [] };
    const { data: meals } = await supabase.from("meals").select("ingredients").in("id", Array.from(ids));
    const map = new Map<string, { name: string; quantity: string; category: string }>();
    for (const meal of meals ?? []) {
      for (const ing of (meal.ingredients as any[]) ?? []) {
        const name = String(ing.name ?? "").trim().toLowerCase();
        if (!name) continue;
        const key = name;
        const existing = map.get(key);
        const qty = String(ing.quantity ?? "");
        const cat = String(ing.category ?? "Other");
        if (existing) {
          existing.quantity = existing.quantity ? `${existing.quantity} + ${qty}` : qty;
        } else {
          map.set(key, { name, quantity: qty, category: cat });
        }
      }
    }
    return { items: Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)) };
  });
