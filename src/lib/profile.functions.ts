import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileSchema = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  avatar_url: z.string().trim().max(500).nullable().optional(),
  dietary_preferences: z.array(z.string().max(40)).max(20).optional(),
  allergies: z.array(z.string().max(40)).max(20).optional(),
  household_size: z.number().int().min(1).max(20).optional(),
  daily_calories: z.number().int().min(800).max(6000).optional(),
});

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
