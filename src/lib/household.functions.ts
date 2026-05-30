import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function makeToken() {
  // 24 url-safe chars
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const getHousehold = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Profile not found");

    const [{ data: members, error: mErr }, { data: invites, error: iErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("household_id", me.household_id),
      supabase
        .from("household_invites")
        .select("id, token, created_at, expires_at, used_by, used_at")
        .eq("household_id", me.household_id)
        .order("created_at", { ascending: false }),
    ]);
    if (mErr) throw new Error(mErr.message);
    if (iErr) throw new Error(iErr.message);

    return {
      household_id: me.household_id as string,
      members: members ?? [],
      invites: invites ?? [],
    };
  });

export const createHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", userId)
      .maybeSingle();
    if (meErr) throw new Error(meErr.message);
    if (!me) throw new Error("Profile not found");

    const token = makeToken();
    const { data, error } = await supabase
      .from("household_invites")
      .insert({ token, household_id: me.household_id, created_by: userId })
      .select("token, expires_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const getInviteInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: invite, error } = await supabase
      .from("household_invites")
      .select("household_id, expires_at, used_by, created_by")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) return { valid: false as const, reason: "not_found" as const };
    if (invite.used_by) return { valid: false as const, reason: "used" as const };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { valid: false as const, reason: "expired" as const };

    const { data: inviter } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", invite.created_by)
      .maybeSingle();

    return {
      valid: true as const,
      household_id: invite.household_id,
      inviter_name: inviter?.display_name ?? null,
    };
  });

export const acceptHouseholdInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: invite, error: iErr } = await supabase
      .from("household_invites")
      .select("id, household_id, expires_at, used_by")
      .eq("token", data.token)
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!invite) throw new Error("Invite not found");
    if (invite.used_by) throw new Error("Invite already used");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("Invite expired");

    const { error: pErr } = await supabase
      .from("profiles")
      .update({ household_id: invite.household_id })
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);

    const { error: uErr } = await supabase
      .from("household_invites")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", invite.id);
    if (uErr) throw new Error(uErr.message);

    return { ok: true, household_id: invite.household_id };
  });

export const leaveHousehold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Move user back into their own household (id = userId)
    const { error } = await supabase
      .from("profiles")
      .update({ household_id: userId })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
