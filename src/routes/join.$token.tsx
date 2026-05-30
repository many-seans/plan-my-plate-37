import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptHouseholdInvite, getInviteInfo } from "@/lib/household.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: "Join household — Prepbowl" }] }),
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const fetchInfo = useServerFn(getInviteInfo);
  const accept = useServerFn(acceptHouseholdInvite);

  const [state, setState] = useState<
    | { status: "checking" }
    | { status: "needs_auth" }
    | { status: "ready"; inviter: string | null }
    | { status: "invalid"; reason: string }
  >({ status: "checking" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        // Stash invite and redirect to signup
        if (typeof window !== "undefined") {
          sessionStorage.setItem("pendingInvite", token);
        }
        if (!cancelled) setState({ status: "needs_auth" });
        return;
      }
      try {
        const info = await fetchInfo({ data: { token } });
        if (cancelled) return;
        if (!info.valid) {
          setState({ status: "invalid", reason: info.reason });
        } else {
          setState({ status: "ready", inviter: info.inviter_name });
        }
      } catch (e: any) {
        if (!cancelled) setState({ status: "invalid", reason: e?.message ?? "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [token, fetchInfo]);

  async function onAccept() {
    setBusy(true);
    try {
      await accept({ data: { token } });
      if (typeof window !== "undefined") sessionStorage.removeItem("pendingInvite");
      toast.success("Joined household");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not accept invite");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="rounded-3xl bg-card p-8 text-center shadow-warm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Household invite</h1>

        {state.status === "checking" && (
          <p className="mt-3 text-sm text-muted-foreground">Checking your invite…</p>
        )}

        {state.status === "needs_auth" && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in or create an account to join this household.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/login" })}>
                Log in
              </Button>
              <Button className="rounded-full" onClick={() => navigate({ to: "/signup" })}>
                Sign up
              </Button>
            </div>
          </>
        )}

        {state.status === "ready" && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {state.inviter ? `${state.inviter} invited you` : "You've been invited"} to share a Prepbowl household.
            </p>
            <Button onClick={onAccept} disabled={busy} className="mt-5 w-full rounded-full">
              {busy ? "Joining…" : "Join household"}
            </Button>
          </>
        )}

        {state.status === "invalid" && (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {state.reason === "expired"
                ? "This invite link has expired."
                : state.reason === "used"
                ? "This invite has already been used."
                : "This invite link isn't valid."}
            </p>
            <Button className="mt-5 w-full rounded-full" onClick={() => navigate({ to: "/dashboard" })}>
              Go to dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
