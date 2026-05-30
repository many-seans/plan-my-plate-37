import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Heart, Clock, Flame } from "lucide-react";
import { listFavorites, toggleFavorite } from "@/lib/meals.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({ meta: [{ title: "Favourites — Prepbowl" }] }),
  component: Favorites,
});

function Favorites() {
  const fetchFav = useServerFn(listFavorites);
  const toggleFav = useServerFn(toggleFavorite);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["favorites", "full"], queryFn: () => fetchFav() });
  const [open, setOpen] = useState<any | null>(null);

  async function remove(mealId: string) {
    await toggleFav({ data: { meal_id: mealId } });
    toast.success("Removed from favourites");
    qc.invalidateQueries({ queryKey: ["favorites"] });
    setOpen(null);
  }

  return (
    <div className="px-5 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Favourites</h1>
        <p className="text-sm text-muted-foreground">Meals you've saved to revisit.</p>
      </header>

      {data && data.length === 0 && (
        <div className="rounded-3xl bg-secondary p-8 text-center">
          <Heart className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Tap the heart on any meal to save it here.</p>
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((f: any) => {
          const m = f.meals;
          if (!m) return null;
          return (
            <button key={f.id} onClick={() => setOpen(m)} className="w-full rounded-2xl bg-card p-4 text-left shadow-sm">
              <div className="font-display text-lg font-semibold">{m.title}</div>
              {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {m.prep_minutes != null && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {m.prep_minutes} min</span>}
                {m.calories != null && <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {m.calories} kcal</span>}
              </div>
            </button>
          );
        })}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          {open && (
            <>
              <SheetHeader><SheetTitle className="text-left font-display text-2xl">{open.title}</SheetTitle></SheetHeader>
              {open.description && <p className="mt-3 text-sm">{open.description}</p>}
              <h3 className="mt-5 font-semibold">Ingredients</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {(open.ingredients ?? []).map((ing: any, idx: number) => (
                  <li key={idx} className="flex justify-between border-b border-border py-1">
                    <span className="capitalize">{ing.name}</span>
                    <span className="text-muted-foreground">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
              {open.instructions && (<><h3 className="mt-5 font-semibold">Instructions</h3><p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{open.instructions}</p></>)}
              <Button onClick={() => remove(open.id)} variant="outline" className="mt-5 w-full rounded-full">Remove from favourites</Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
