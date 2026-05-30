import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { getShoppingList } from "@/lib/plan.functions";

export const Route = createFileRoute("/_authenticated/shopping")({
  head: () => ({ meta: [{ title: "Shopping list — Prepbowl" }] }),
  component: Shopping,
});

function Shopping() {
  const fetchList = useServerFn(getShoppingList);
  const { data, isLoading } = useQuery({ queryKey: ["shopping"], queryFn: () => fetchList() });
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Load checked state from localStorage per week
  useEffect(() => {
    try {
      const raw = localStorage.getItem("prepbowl_shopping_checked");
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("prepbowl_shopping_checked", JSON.stringify(checked)); } catch {}
  }, [checked]);

  const items = data?.items ?? [];
  const grouped = items.reduce<Record<string, typeof items>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="px-5 pt-6">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold">Shopping list</h1>
        <p className="text-sm text-muted-foreground">Auto-built from this week's plan.</p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <div className="rounded-3xl bg-secondary p-8 text-center">
          <ShoppingBasket className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Generate a meal plan to build your shopping list.</p>
        </div>
      )}

      <div className="space-y-5">
        {Object.entries(grouped).map(([category, list]) => (
          <section key={category} className="rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
            <ul className="divide-y divide-border">
              {list.map((it) => {
                const key = `${category}:${it.name}`;
                const isChecked = !!checked[key];
                return (
                  <li key={key}>
                    <button
                      onClick={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
                      className="flex w-full items-center justify-between py-2.5 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${isChecked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                          {isChecked && <Check className="h-3 w-3" />}
                        </span>
                        <span className={`capitalize ${isChecked ? "text-muted-foreground line-through" : ""}`}>{it.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{it.quantity}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
