import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Heart, Clock, Flame, X } from "lucide-react";
import { getCurrentPlan } from "@/lib/plan.functions";
import { listFavoriteIds, toggleFavorite } from "@/lib/meals.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Planner — Prepbowl" }] }),
  component: Planner,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["breakfast", "lunch", "dinner"] as const;

function Planner() {
  const fetchPlan = useServerFn(getCurrentPlan);
  const fetchFavIds = useServerFn(listFavoriteIds);
  const toggleFav = useServerFn(toggleFavorite);
  const qc = useQueryClient();

  const planQ = useQuery({ queryKey: ["plan", "current"], queryFn: () => fetchPlan() });
  const favQ = useQuery({ queryKey: ["favorites", "ids"], queryFn: () => fetchFavIds() });
  const [openMeal, setOpenMeal] = useState<any | null>(null);

  const mealsById = new Map((planQ.data?.meals ?? []).map((m: any) => [m.id, m]));
  const planArr = (planQ.data?.plan?.plan as any[]) ?? [];
  const favSet = new Set(favQ.data ?? []);

  async function onToggleFav(mealId: string) {
    const res = await toggleFav({ data: { meal_id: mealId } });
    toast.success(res.favorited ? "Saved to favourites" : "Removed from favourites");
    qc.invalidateQueries({ queryKey: ["favorites"] });
  }

  return (
    <div className="px-5 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Weekly planner</h1>
        <p className="text-sm text-muted-foreground">Tap a meal to view full recipe.</p>
      </header>

      {planArr.length === 0 && !planQ.isLoading && (
        <EmptyState />
      )}

      <div className="space-y-4">
        {planArr.map((day, i) => (
          <section key={i} className="rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold">{DAYS[i]}</h2>
            <div className="mt-2 grid gap-2">
              {SLOTS.map((slot) => {
                const id = day[`${slot}_meal_id`];
                const meal = id ? (mealsById.get(id) as any) : null;
                return (
                  <button
                    key={slot}
                    onClick={() => meal && setOpenMeal(meal)}
                    className="flex w-full items-center justify-between rounded-xl bg-secondary px-3 py-2.5 text-left transition hover:bg-accent/40"
                  >
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">{slot}</div>
                      <div className="text-sm font-medium">{meal?.title ?? "—"}</div>
                    </div>
                    {meal && (
                      <Heart
                        onClick={(e) => { e.stopPropagation(); onToggleFav(meal.id); }}
                        className={favSet.has(meal.id) ? "h-5 w-5 fill-primary text-primary" : "h-5 w-5 text-muted-foreground"}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={!!openMeal} onOpenChange={(v) => !v && setOpenMeal(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          {openMeal && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left font-display text-2xl">{openMeal.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                {openMeal.prep_minutes != null && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {openMeal.prep_minutes} min</span>}
                {openMeal.calories != null && <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4" /> {openMeal.calories} kcal</span>}
              </div>
              {openMeal.description && <p className="mt-3 text-sm">{openMeal.description}</p>}
              <h3 className="mt-5 font-semibold">Ingredients</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(openMeal.ingredients ?? []).map((ing: any, idx: number) => (
                  <li key={idx} className="flex justify-between border-b border-border py-1">
                    <span className="capitalize">{ing.name}</span>
                    <span className="text-muted-foreground">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
              {openMeal.instructions && (
                <>
                  <h3 className="mt-5 font-semibold">Instructions</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{openMeal.instructions}</p>
                </>
              )}
              <Button onClick={() => onToggleFav(openMeal.id)} variant="outline" className="mt-5 w-full rounded-full">
                <Heart className={favSet.has(openMeal.id) ? "mr-2 h-4 w-4 fill-primary text-primary" : "mr-2 h-4 w-4"} />
                {favSet.has(openMeal.id) ? "Saved" : "Save to favourites"}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl bg-secondary p-8 text-center">
      <p className="text-sm text-muted-foreground">No plan for this week yet.</p>
    </div>
  );
}
