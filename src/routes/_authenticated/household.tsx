import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Link as LinkIcon, LogOut, Users } from "lucide-react";
import { createHouseholdInvite, getHousehold, leaveHousehold } from "@/lib/household.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/household")({
  head: () => ({ meta: [{ title: "Household — Prepbowl" }] }),
  component: HouseholdPage,
});

function HouseholdPage() {
  const fetchHousehold = useServerFn(getHousehold);
  const createInvite = useServerFn(createHouseholdInvite);
  const leave = useServerFn(leaveHousehold);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["household"],
    queryFn: () => fetchHousehold(),
  });
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    setCreating(true);
    try {
      await createInvite();
      qc.invalidateQueries({ queryKey: ["household"] });
      toast.success("Invite link created");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create invite");
    } finally {
      setCreating(false);
    }
  }

  async function onLeave() {
    if (!confirm("Leave this household? You'll go back to your own household.")) return;
    try {
      await leave();
      qc.invalidateQueries({ queryKey: ["household"] });
      toast.success("Left household");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not leave");
    }
  }

  function copy(token: string) {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  async function share(token: string) {
    const url = `${window.location.origin}/join/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Prepbowl household", url });
      } catch {/* user cancelled */}
    } else {
      copy(token);
    }
  }

  const activeInvites = (data?.invites ?? []).filter(
    (i) => !i.used_by && new Date(i.expires_at).getTime() > Date.now(),
  );

  return (
    <div className="px-5 pt-6 pb-24">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Household</h1>
        <p className="text-sm text-muted-foreground">
          Share meal plans, favourites, and shopping lists with people you cook for.
        </p>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" /> Members
            <span className="text-muted-foreground">({data?.members.length ?? 0})</span>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                      {(m.display_name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm">{m.display_name ?? "Member"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <LinkIcon className="h-4 w-4 text-primary" /> Invite link
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Create a link and share it with a household member. Links expire after 7 days.
          </p>

          <Button onClick={onCreate} disabled={creating} className="w-full rounded-full">
            {creating ? "Creating…" : "Create invite link"}
          </Button>

          {activeInvites.length > 0 && (
            <ul className="mt-4 space-y-2">
              {activeInvites.map((inv) => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${inv.token}`;
                return (
                  <li key={inv.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="truncate text-xs text-muted-foreground">{url}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => copy(inv.token)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button size="sm" className="rounded-full" onClick={() => share(inv.token)}>
                        Share
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {(data?.members.length ?? 0) > 1 && (
          <Button variant="outline" className="w-full rounded-full" onClick={onLeave}>
            <LogOut className="mr-2 h-4 w-4" /> Leave household
          </Button>
        )}
      </div>
    </div>
  );
}
