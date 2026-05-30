import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, Sparkles, ShoppingBasket, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prepbowl — AI-Powered Weekly Meal Prep" },
      { name: "description", content: "Generate personalized weekly meal plans, auto-build your shopping list, and save your favourite recipes — all in one warm, simple app." },
      { property: "og:title", content: "Prepbowl — AI-Powered Weekly Meal Prep" },
      { property: "og:description", content: "Generate personalized weekly meal plans, auto-build your shopping list, and save your favourite recipes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="safe-top mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <ChefHat className="h-6 w-6 text-primary" />
          Prepbowl
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          <Link to="/signup"><Button size="sm" className="rounded-full">Get started</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8">
        <section className="rounded-3xl bg-secondary p-8 text-center shadow-warm sm:p-14">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-background/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered weekly meal planning
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Plan a week of meals<br />in under a minute.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Tell Prepbowl your diet, allergies, and household size. Get a personalized 7-day plan, a tidy shopping list, and recipes you'll actually cook.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/signup"><Button size="lg" className="rounded-full px-6">Start planning free</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="rounded-full px-6">I have an account</Button></Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <Feature icon={<Sparkles />} title="AI meal plans" body="Personalized to your diet, allergies, and calorie target — regenerate anything you don't love." />
          <Feature icon={<ShoppingBasket />} title="Smart shopping lists" body="Ingredients across the week, auto-grouped and ready to check off at the store." />
          <Feature icon={<Heart />} title="Save favourites" body="Star recipes you love and reuse them in future plans." />
        </section>
      </main>

      <footer className="border-t border-border bg-secondary/50 py-6 text-center text-sm text-muted-foreground">
        Made with ❤ for home cooks.
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
