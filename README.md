# FIFA World Cup 2026 — Prediction League

A multiplayer prediction league for 18 friends, built with **React + Vite + TypeScript +
Tailwind** and backed by **Supabase**. Players log in with a username + password, predict
scores / scorers / assists, spend wildcards, and an admin reveals results and points.

## How it plays

- **Predict** each match: score, goalscorer, assist.
- **Scoring (standard):** exact score **5** · correct result only **2** · correct
  goalscorer **+2** · correct assist **+2**.
- **Wildcards (5 each):**
  - **Double Points** — ×2 your total points for that match.
  - **Late Prediction** — submit a *second* prediction, allowed only while the admin has the
    match's half-time window open; it supersedes your original.
  - **Assist** — doubles the assist points (correct assist becomes +4).
- **Admin** (the `ammar` account) enters results, calculates points, makes corrections, and
  controls **when results become visible** (nothing shows until "Results published" is on).

## One-time setup

### 1. Apply the database schema
Run `supabase/schema.sql` against the project — either via the connected **Supabase MCP**, or
paste it into the Supabase dashboard **SQL editor** and run. This creates the tables, RLS
policies, the `score_match` RPC, and the `match_view` / `leaderboard` views.

### 2. Fill in credentials
Copy `.env.example` → `.env.local` and set:
- `VITE_SUPABASE_ANON_KEY` — Settings → API → anon public key (used by the app).
- `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → service_role (used **only** by the seed
  script; never shipped to the browser).

### 3. Seed accounts + matches
```bash
node scripts/seed.mjs
```
Creates the admin account (`ammar`) plus 17 player accounts (passwords from the original list),
their profiles, and 5 sample fixtures + one 🧪 **test match** (~15 min kickoff) for trying the flow.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # preview the production build
```

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages). Set the two `VITE_`
env vars in the host's environment.

## Project layout

```
src/
  pages/        Login, Dashboard (player), Admin
  components/   MatchCard, Leaderboard, WildcardChips, StatusBadge, Countdown, Toast, …
  components/admin/  AddMatchForm, MatchAdminRow, Corrections
  auth/         AuthProvider (username→synthetic email), RequireAuth / RequireAdmin
  lib/          supabase client, scoring helpers
supabase/schema.sql   database schema + RLS + scoring
scripts/seed.mjs      one-time account/match seeding
```

> Security note: usernames map to a synthetic email (`username@wcl.local`) behind the scenes,
> so players only ever type a username while still getting real Supabase Auth + RLS.
