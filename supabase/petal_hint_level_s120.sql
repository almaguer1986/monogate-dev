-- petal_attempts: add hint_level_at_solve INTEGER
--
-- Date: 2026-04-28
-- Run in Supabase SQL editor. Idempotent — safe to apply twice.
--
-- Rationale: when an agent solves a theorem (POST /api/petal/grade
-- returns pass), record the hint level they were at — defined as
-- "count of prior attempts on this theorem by this agent, capped
-- at 4 per the progressive-reveal spec". This is the single source
-- of usage-derived difficulty: a theorem solved zero-shot many
-- times calibrates as "trivial"; one that always needs the full
-- hint stack calibrates as "expert". Replaces the hand-assigned
-- difficulty labels over time.
--
-- The column is nullable; only pass-result rows populate it. Older
-- rows pre-dating this migration stay NULL and are excluded from
-- difficulty / zero_shot_solves / avg_hint_level computations on
-- the API side.

-- ─── Add the column (idempotent) ────────────────────────────────

alter table public.petal_attempts
  add column if not exists hint_level_at_solve integer;

-- Sanity-check guard: the value is in [0, 4].
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'petal_attempts_hint_level_range'
  ) then
    alter table public.petal_attempts
      add constraint petal_attempts_hint_level_range
      check (hint_level_at_solve is null
             or (hint_level_at_solve >= 0 and hint_level_at_solve <= 4));
  end if;
end$$;

-- ─── Index — supports the difficulty endpoint's per-theorem
--     hint distribution scan without sequential reads as the
--     attempt log grows. ────────────────────────────────────────

create index if not exists petal_attempts_theorem_hint_idx
  on public.petal_attempts (theorem_id, hint_level_at_solve)
  where hint_level_at_solve is not null;
