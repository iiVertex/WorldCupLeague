# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173 (auto-opens browser)
npm run build      # tsc --noEmit (typecheck) THEN vite build → dist/
npm run preview    # serve the production build locally
npx tsc --noEmit   # typecheck only
```

There is **no test suite, no ESLint, and no separate lint script**. `npm run build` is the only gate — it fails the build on any type error (`strict`, `noUnusedLocals`, `noUnusedParameters` are all on). Run `npx tsc --noEmit` for a fast typecheck without bundling.

## Environment

The app reads `.env.local` (gitignored): `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Without a valid anon key the client logs an error and every query fails. The backend is a hosted Supabase project — there is no local Postgres.

## Architecture

A single-page React app (React 18 + Vite + TypeScript + Tailwind) backed by Supabase (Postgres + Auth + RLS). It's a prediction league for ~18 friends: players predict score/scorer/assist per match, spend wildcards, and an admin enters results and reveals points.

**Provider stack** (`src/main.tsx`): `QueryClientProvider` → `BrowserRouter` → `ToastProvider` → `AuthProvider` → `App`. Three routes (`src/App.tsx`): `/login`, `/` (Dashboard), `/admin`, gated by `RequireAuth` / `RequireAdmin`.

### Auth: usernames are synthetic emails
There is **no sign-up UI**. Players type only a username; `usernameToEmail()` in `src/lib/supabase.ts` maps it to `<username>@wcl.local` and signs in with Supabase password auth. `AuthProvider` holds both the Supabase `session` and the app `player` profile (loaded from the `players` table). A database trigger on `auth.users` (`handle_new_user`) creates the matching `players` row, deriving username from the email and reading `display_name`/`is_admin`/wildcard counts from signup metadata. Accounts are therefore created server-side (admin/seed), not through the app.

### The results-hiding security model (most important invariant)
Match data is split across two tables specifically so unpublished results can't leak:
- **`matches`** — schedule + lifecycle flags (`kickoff`, `halftime_open`, `is_test`, `results_published`). Readable by all signed-in users.
- **`match_results`** — final score/scorers/assisters. RLS hides a row until its parent match has `results_published = true`.

Players never query `match_results` directly. The **Dashboard reads `match_view`**, which nulls out every result column unless `results_published` is true. The **Admin page reads `matches` with embedded `match_results(*)`** and flattens them. When changing how results surface, preserve this split — don't expose result columns on `matches` or widen `match_results` RLS.

### Scoring lives in two places that must stay in sync
The scoring formula exists as both:
- `src/lib/scoring.ts` — `scorePrediction()`, used client-side for live previews and the points breakdown shown on cards.
- The Postgres `score_match(p_match_id)` RPC + `score_prediction(...)` function — the **authoritative** scorer the admin runs.

Both implement: **+1** home score, **+1** away score, **+1** correct winner/result — each scored independently, so a perfect scoreline is worth 3; **+1** correct goalscorer; **+1** correct assist **but only when the assist wildcard was played on that match** (no card → the assist pick is ignored); whole match total **×2** with the double-points wildcard. **Editing one requires editing the other**, or admin-calculated points will diverge from the preview.

### Prediction phases (initial vs late)
A prediction is uniquely keyed by `(match_id, player_id, phase)` where phase is `initial` or `late`. The Dashboard upserts on that conflict target. `late` is only writable while `halftime_open` and **supersedes** the initial pick (`late ?? initial` is the one that counts). `score_match` zeroes the superseded `initial` row so leaderboard sums never double-count. `matchStatus()` in `scoring.ts` derives the UI lifecycle: `upcoming → locked → halftime → final`.

### Other invariants
- **`points` is server-only.** A trigger (`enforce_prediction_points`) forces non-admin writes to keep the prior `points` value, so players can't set their own score via the API.
- **Wildcard limits are not enforced in the DB.** "Remaining" is computed client-side in `Dashboard.tsx` as `allowance − distinct matches used`; the admin reconciles via the Corrections tab. Per league rules each player gets **5 of each** wildcard (Double Points, Late, Assist).
- **`leaderboard`** is a view (over the `leaderboard_rows()` SECURITY DEFINER function) summing `points` across **all** matches, including `is_test` ones. (Test matches used to be excluded from standings; that exclusion was removed so test-match points now count.)
- Data fetching uses **TanStack Query**; mutations call `qc.invalidateQueries` to refresh. Cross-cutting refreshes (admin) invalidate `admin-matches`, `matches`, and `leaderboard` together.

## Database changes

The schema (tables, RLS policies, `match_view`/`leaderboard`, `score_match`) is managed through **Supabase migrations applied via the Supabase MCP** (`apply_migration`). After any DDL change, run `get_advisors` to catch missing RLS or new SECURITY DEFINER exposure. Note: the README references `supabase/schema.sql` and `scripts/seed.mjs`, but those files are not present in the tree — the live schema was applied via MCP migrations.

## Legacy files

`login.html` and `main.html` at the repo root are an earlier standalone vanilla-HTML/CSS prototype. They are **not** part of the Vite build or the running app (which is entirely under `src/`); ignore them unless explicitly asked.
