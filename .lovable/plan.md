
## Mobile-First Meal Prep App

A warm-kitchen themed (cream, sand, terracotta) PWA-style meal prep app built on TanStack Start + Lovable Cloud (Supabase). All AI runs server-side via OpenRouter.

### Tech & setup
- Enable Lovable Cloud (Supabase) for auth + database
- Enable Google sign-in provider in Supabase Auth
- Add `OPENROUTER_API_KEY` as a runtime secret (user provides via secrets form)
- Note: Template targets Cloudflare Workers; code will stay portable (no Cloudflare-only APIs) so a Netlify build is feasible, but Lovable's built-in publish will be the supported deploy path

### Design system (`src/styles.css`)
- Background `#faf8f5`, surface `#f0ebe3`, muted `#c9b99a`, primary terracotta `#c4654a`
- Rounded-2xl cards, soft shadows, generous spacing, friendly serif headings + clean sans body
- Mobile-first; max-width container centered on tablet/desktop

### Database schema (migration)
- `profiles` (id → auth.users, display_name, avatar_url, dietary_preferences text[], allergies text[], household_size int, daily_calories int) — RLS: owner only; auto-create on signup via trigger
- `meals` (id, user_id, title, description, ingredients jsonb, instructions text, calories, prep_minutes, tags text[], created_at) — RLS: owner only
- `favorites` (id, user_id, meal_id, created_at) — unique(user_id, meal_id), RLS: owner only
- `meal_plans` (id, user_id, week_start date, plan jsonb [{day, breakfast_meal_id, lunch_meal_id, dinner_meal_id}], created_at) — RLS: owner only
- Proper GRANTs to authenticated + service_role on all tables

### Routes (file-based, TanStack)
- `/` — public landing (hero, features, CTA → /login)
- `/login`, `/signup`, `/reset-password` — email/password + Google button
- `/_authenticated.tsx` — guard with `beforeLoad` redirect + child session hydration
- `/_authenticated/dashboard` — week-at-a-glance, quick actions, today's meals
- `/_authenticated/planner` — weekly meal planner grid (7 days × 3 meals), swap/regenerate
- `/_authenticated/generate` — AI generator form (preferences pre-filled from profile) → creates meals + plan
- `/_authenticated/shopping` — auto-aggregated shopping list from active week, checkable items
- `/_authenticated/favorites` — saved meals list with detail sheet
- `/_authenticated/profile` — edit display name, avatar, diet, allergies, household, calorie goal; logout

### Mobile UX
- Sticky bottom navigation (Home, Planner, Generate, Shopping, Profile) shown only on authenticated routes
- Bottom sheets/drawers for meal details and edits
- Safe-area padding, large touch targets

### AI integration (OpenRouter, server-only)
- `src/lib/ai.functions.ts`:
  - `generateMealPlan` — `createServerFn` + `requireSupabaseAuth`; reads profile, calls OpenRouter chat completions with a structured JSON prompt (model `google/gemini-2.5-flash` via OpenRouter), validates with Zod, inserts meals + meal_plan row
  - `regenerateMeal` — single-meal swap
- API key read from `process.env.OPENROUTER_API_KEY` inside handler only

### Shopping list logic
- Server fn aggregates ingredients across active week's plan, normalizes units, groups by category, returns to client

### Components
- `BottomNav`, `MealCard`, `DayColumn`, `WeekPlanner`, `IngredientRow`, `FavoriteButton`, `EmptyState`, profile form, auth forms with Zod validation

### Out of scope (this iteration)
- Push notifications, sharing plans, grocery store integrations, recipe imports from URL

### Deployment note
After build, Lovable's publish ships to `*.lovable.app`. For Netlify, the user would export the repo and add a `netlify.toml` with the Node adapter — happy to add that config on request.
