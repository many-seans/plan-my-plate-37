import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Prepbowl" }] }),
  component: ResetPage,
});

function ResetPage() {
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for a reset link.");
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated."); window.location.href = "/dashboard"; }
  }

  return (
    <AuthShell title={isRecovery ? "Set a new password" : "Reset your password"} subtitle={isRecovery ? "Choose a new password for your account." : "We'll email you a reset link."}>
      {isRecovery ? (
        <form onSubmit={updatePassword} className="space-y-3">
          <div>
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
        </form>
      ) : (
        <form onSubmit={sendReset} className="space-y-3">
          <div>
            <Label htmlFor="em">Email</Label>
            <Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline">Back to log in</Link>
      </p>
    </AuthShell>
  );
}
