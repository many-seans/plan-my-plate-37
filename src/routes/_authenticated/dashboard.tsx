import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, ChefHat, Clock, Flame } from "lucide-react";
import { getProfile } from "@/lib/profile.functions";
import { getCurrentPlan } from "@/lib/plan.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Prepbowl" }] }),
  component: Dashboard,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Dashboard() {
  const fetchProfile = useServerFn(getProfile);
  const fetchPlan = useServerFn(getCurrentPlan);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const planQ = useQuery({ queryKey: ["plan", "current"], queryFn: () => fetchPlan() });

  const todayIdx = (new Date().getDay() + 6) % 7;
  const today = (planQ.data?.plan?.plan as any[] | undefined)?.[todayIdx];
  const mealsById = new Map((planQ.data?.meals ?? []).map((m: any) => [m.id, m]));

  return (
    <div className="px-5 pt-6">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Hi {profile.data?.display_name ?? "there"} 👋</p>
        <h1 className="font-display text-3xl font-semibold">This week's kitchen</h1>
      </header>

      {!planQ.data?.plan && !planQ.isLoading && (
        <div className="rounded-3xl bg-secondary p-6 text-center shadow-warm">
          <ChefHat className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-2 font-display text-xl font-semibold">No plan yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate your first weekly meal plan in seconds.</p>
          <Link to="/generate">
            <Button className="mt-4 rounded-full"><Sparkles className="mr-2 h-4 w-4" /> Generate plan</Button>
          </Link>
        </div>
      )}

      {today && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today · {DAYS[todayIdx]}</h2>
          <div className="grid gap-3">
            {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
              const id = today[`${slot}_meal_id`];
              const meal = id ? (mealsById.get(id) as any) : null;
              if (!meal) return null;
              return <MealRow key={slot} slot={slot} meal={meal} />;
            })}
          </div>
        </section>
      )}

      {planQ.data?.plan && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Week ahead</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {(planQ.data.plan.plan as any[]).map((d, i) => (
              <Link key={i} to="/planner" className="rounded-xl bg-card p-2 text-center shadow-sm transition hover:bg-secondary">
                <div className="text-[10px] font-medium uppercase text-muted-foreground">{DAYS[i].slice(0,3)}</div>
                <div className="mt-1 text-xs">{[d.breakfast_meal_id, d.lunch_meal_id, d.dinner_meal_id].filter(Boolean).length}/3</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link to="/generate" className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-warm">
          <Sparkles className="h-5 w-5" />
          <div className="mt-3 font-display text-lg font-semibold">New plan</div>
          <div className="text-xs opacity-90">Generate a fresh week</div>
        </Link>
        <Link to="/shopping" className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="font-display text-lg font-semibold">Shopping list</div>
          <div className="text-xs text-muted-foreground">Everything for this week</div>
        </Link>
      </section>
    </div>
  );
}

function MealRow({ slot, meal }: { slot: string; meal: any }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">{slot}</div>
      <div className="mt-1 font-display text-lg font-semibold leading-tight">{meal.title}</div>
      {meal.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meal.description}</p>}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {meal.prep_minutes != null && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {meal.prep_minutes} min</span>}
        {meal.calories != null && <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {meal.calories} kcal</span>}
      </div>
    </div>
  );
}
