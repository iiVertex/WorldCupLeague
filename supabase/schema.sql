-- =============================================================================
-- FIFA World Cup 2026 Prediction League — schema, security, scoring
-- Apply this once (Supabase SQL editor, MCP, or `supabase db` migration).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

create extension if not exists pgcrypto;

-- ============================ TABLES =========================================

-- One profile row per auth user. Wildcard columns hold the STARTING allowance;
-- "remaining" is derived on the client from how many have been used.
create table if not exists public.players (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  is_admin     boolean not null default false,
  wc_double    int not null default 5,
  wc_late      int not null default 5,
  wc_assist    int not null default 5,
  created_at   timestamptz not null default now()
);

-- Scheduling + visibility flags only. NO final scores live here, so this table
-- can be world-readable (needed for prediction rules) without leaking results.
create table if not exists public.matches (
  id                bigint generated always as identity primary key,
  home_team         text not null,
  away_team         text not null,
  home_flag         text,
  away_flag         text,
  kickoff           timestamptz not null,
  halftime_open     boolean not null default false,
  is_test           boolean not null default false,
  results_published boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Sensitive result data, gated by RLS so players only see it once published.
create table if not exists public.match_results (
  match_id   bigint primary key references public.matches (id) on delete cascade,
  final_home int not null,
  final_away int not null,
  scorers    text[] not null default '{}',
  assisters  text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id           bigint generated always as identity primary key,
  match_id     bigint not null references public.matches (id) on delete cascade,
  player_id    uuid not null references public.players (id) on delete cascade,
  pred_home    int not null,
  pred_away    int not null,
  pred_scorer  text,
  pred_assist  text,
  wc_double    boolean not null default false,
  wc_assist    boolean not null default false,
  phase        text not null default 'initial' check (phase in ('initial','late')),
  points       int not null default 0,
  submitted_at timestamptz not null default now(),
  unique (match_id, player_id, phase)
);

-- ============================ HELPERS ========================================

-- SECURITY DEFINER so policies can check admin status without recursing into
-- the players RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.players where id = auth.uid()), false);
$$;

-- ============================ SCORING ========================================
-- Standard scheme: exact 5 / result 2 / scorer +2 / assist +2 (×2 with assist
-- wildcard). Whole-match total ×2 with the Double wildcard. The "late"
-- (half-time) prediction supersedes the initial one; the non-chosen row scores 0.
create or replace function public.score_match(p_match_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r           public.match_results%rowtype;
  rec         record;
  pts         int;
  scorers_l   text[];
  assisters_l text[];
begin
  select * into r from public.match_results where match_id = p_match_id;
  if not found then
    raise exception 'No result entered for match %', p_match_id;
  end if;

  scorers_l   := array(select lower(trim(x)) from unnest(r.scorers) x);
  assisters_l := array(select lower(trim(x)) from unnest(r.assisters) x);

  update public.predictions set points = 0 where match_id = p_match_id;

  for rec in
    select distinct on (player_id) *
    from public.predictions
    where match_id = p_match_id
    order by player_id, (phase = 'late') desc   -- late prediction wins
  loop
    pts := 0;

    if rec.pred_home = r.final_home and rec.pred_away = r.final_away then
      pts := pts + 5;
    elsif sign(rec.pred_home - rec.pred_away) = sign(r.final_home - r.final_away) then
      pts := pts + 2;
    end if;

    if rec.pred_scorer is not null and lower(trim(rec.pred_scorer)) = any(scorers_l) then
      pts := pts + 2;
    end if;

    if rec.pred_assist is not null and lower(trim(rec.pred_assist)) = any(assisters_l) then
      pts := pts + (case when rec.wc_assist then 4 else 2 end);
    end if;

    if rec.wc_double then
      pts := pts * 2;
    end if;

    update public.predictions set points = pts where id = rec.id;
  end loop;
end;
$$;

-- ============================ VIEWS ==========================================
-- Player-facing match feed. Owned by postgres (SECURITY DEFINER semantics) so
-- it bypasses RLS, but it NULLs result columns until the admin publishes — so
-- nothing leaks even via a raw API read.
create or replace view public.match_view as
select
  m.id, m.home_team, m.away_team, m.home_flag, m.away_flag, m.kickoff,
  m.halftime_open, m.is_test, m.results_published,
  case when m.results_published then r.final_home end as final_home,
  case when m.results_published then r.final_away end as final_away,
  case when m.results_published then coalesce(r.scorers,   '{}') else '{}' end as scorers,
  case when m.results_published then coalesce(r.assisters, '{}') else '{}' end as assisters
from public.matches m
left join public.match_results r on r.match_id = m.id;

-- Leaderboard: total points per player over PUBLISHED matches only.
create or replace view public.leaderboard as
select
  p.id           as player_id,
  p.username,
  p.display_name,
  coalesce(sum(case when m.results_published then pr.points else 0 end), 0)::int as total_points
from public.players p
left join public.predictions pr on pr.player_id = p.id
left join public.matches m      on m.id = pr.match_id
group by p.id, p.username, p.display_name;

-- ============================ RLS ============================================
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.match_results enable row level security;
alter table public.predictions   enable row level security;

-- players: everyone reads (leaderboard names); only admin edits.
drop policy if exists players_read       on public.players;
drop policy if exists players_admin_write on public.players;
create policy players_read        on public.players for select using (true);
create policy players_admin_write on public.players for update
  using (public.is_admin()) with check (public.is_admin());

-- matches: everyone reads scheduling; only admin writes.
drop policy if exists matches_read        on public.matches;
drop policy if exists matches_admin_write on public.matches;
create policy matches_read        on public.matches for select using (true);
create policy matches_admin_write on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

-- match_results: readable only when published (or by admin); only admin writes.
drop policy if exists results_read        on public.match_results;
drop policy if exists results_admin_write on public.match_results;
create policy results_read on public.match_results for select using (
  public.is_admin()
  or exists (select 1 from public.matches m where m.id = match_id and m.results_published)
);
create policy results_admin_write on public.match_results for all
  using (public.is_admin()) with check (public.is_admin());

-- predictions (policy names mirror the live DB, which uses `predictions_*`):
--   read   → own row only, OR — for an admin — once the match is published or
--            >=2h past kickoff. Admins are participants too, so they must NOT see
--            other players' picks before a match has effectively finished.
--   insert → own, and (initial within the 10h window before kickoff) or
--            (late while half-time open)
--   update → own within the same window, OR admin (corrections)
--   delete → admin only
-- NOTE: there is intentionally NO blanket admin SELECT and NO `FOR ALL` admin
-- policy — either would re-grant admins unconditional reads and defeat the gate.
drop policy if exists predictions_select       on public.predictions;
drop policy if exists predictions_insert       on public.predictions;
drop policy if exists predictions_update       on public.predictions;
drop policy if exists predictions_admin_delete on public.predictions;

create policy predictions_select on public.predictions for select using (
  player_id = auth.uid()
  or (
    public.is_admin()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.results_published or now() >= m.kickoff + interval '2 hours')
    )
  )
);

create policy predictions_insert on public.predictions for insert with check (
  player_id = auth.uid()
  and exists (
    select 1 from public.matches m
    where m.id = match_id
      and ((phase = 'initial' and now() >= m.kickoff - interval '10 hours' and now() < m.kickoff)
        or (phase = 'late'    and m.halftime_open))
  )
);

create policy predictions_update on public.predictions for update
  using (player_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      player_id = auth.uid()
      and exists (
        select 1 from public.matches m
        where m.id = match_id
          and ((phase = 'initial' and now() >= m.kickoff - interval '10 hours' and now() < m.kickoff)
            or (phase = 'late'    and m.halftime_open))
      )
    )
  );

create policy predictions_admin_delete on public.predictions for delete
  using (public.is_admin());

-- ============================ GRANTS =========================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.predictions to authenticated;
grant select on public.players, public.matches, public.match_results to authenticated;
grant select on public.matches to anon;
grant select on public.match_view, public.leaderboard to anon, authenticated;
grant update on public.matches, public.match_results, public.players to authenticated; -- gated by RLS (admin only)
grant insert on public.matches, public.match_results to authenticated;                 -- gated by RLS (admin only)
grant delete on public.matches to authenticated;                                       -- gated by RLS (admin only)
grant execute on function public.score_match(bigint) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
