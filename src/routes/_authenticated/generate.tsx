import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateWeeklyPlan } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({ meta: [{ title: "Generate — Prepbowl" }] }),
  component: Generate,
});

function Generate() {
  const gen = useServerFn(generateWeeklyPlan);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function onGenerate() {
    setLoading(true);
    try {
      await gen({ data: { extra_notes: notes } });
      toast.success("Your weekly plan is ready!");
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["shopping"] });
      navigate({ to: "/planner" });
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Generate a plan</h1>
        <p className="text-sm text-muted-foreground">We'll use your profile preferences. Add notes if you'd like to steer it.</p>
      </header>

      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <label className="text-sm font-medium" htmlFor="notes">Extra notes (optional)</label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 400))}
          placeholder="e.g. high protein, batch-cook Sunday, kid-friendly dinners…"
          className="mt-2 min-h-24"
          maxLength={400}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{notes.length}/400</p>

        <Button onClick={onGenerate} disabled={loading} className="mt-4 w-full rounded-full">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate this week</>}
        </Button>
        {loading && <p className="mt-3 text-center text-xs text-muted-foreground">This may take 20–40 seconds.</p>}
      </div>

      <p className="mt-4 px-2 text-xs text-muted-foreground">
        Tip: keep your dietary preferences and allergies up-to-date on your profile for better plans.
      </p>
    </div>
  );
}
