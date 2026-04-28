-- Blog reactions for monogate.org/blog.
-- Run in Supabase SQL editor.
-- Date: 2026-04-28
--
-- Each visitor (identified by a client-generated UUID stored in
-- localStorage) can register one reaction per post. Reactions are
-- one of: 'up' (👍 useful), 'mind' (🤯 mind blown), 'down' (👎
-- not useful), 'nope' (🚫 bad info).
--
-- The reaction can be changed (upsert on the unique pair) or
-- cleared (delete). RLS allows anon CRUD because the visitor_id
-- in localStorage is the only identity we have for unauth'd
-- readers — this is the minimum viable security model for a
-- low-traffic research blog. If spam becomes a problem, layer in
-- Cloudflare Turnstile or rate-limit at the edge.
--
-- Counts view aggregates per (post_slug, reaction) for the index
-- page or per-post badge to read at page load.

-- ─── Table ───────────────────────────────────────────────────────

create table if not exists public.blog_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_slug   text not null,
  reaction    text not null check (reaction in ('up', 'mind', 'down', 'nope')),
  visitor_id  uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One reaction per (post, visitor) — the upsert key.
create unique index if not exists blog_reactions_post_visitor_uniq
  on public.blog_reactions (post_slug, visitor_id);

-- Hot-path lookup for counts on a post.
create index if not exists blog_reactions_post_idx
  on public.blog_reactions (post_slug);

-- Auto-bump updated_at on row UPDATE.
create or replace function public.blog_reactions_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_reactions_touch on public.blog_reactions;
create trigger blog_reactions_touch
  before update on public.blog_reactions
  for each row execute function public.blog_reactions_touch_updated_at();

-- ─── Counts view ─────────────────────────────────────────────────
-- Aggregated per (post_slug, reaction). Anon SELECT allowed via RLS
-- on the underlying table.

create or replace view public.blog_reaction_counts as
select post_slug, reaction, count(*)::int as count
from public.blog_reactions
group by post_slug, reaction;

-- ─── RLS ─────────────────────────────────────────────────────────

alter table public.blog_reactions enable row level security;

-- READ — anyone can see aggregate counts (and the row data; we have
-- nothing PII in here).
drop policy if exists "anon_read_blog_reactions" on public.blog_reactions;
create policy "anon_read_blog_reactions"
  on public.blog_reactions for select
  to anon, authenticated
  using (true);

-- INSERT — anyone can post a reaction. The unique constraint
-- prevents duplicate (post, visitor) rows; client uses upsert.
drop policy if exists "anon_insert_blog_reactions" on public.blog_reactions;
create policy "anon_insert_blog_reactions"
  on public.blog_reactions for insert
  to anon, authenticated
  with check (true);

-- UPDATE — needed for upsert to switch reactions on the same
-- (post, visitor) pair. Trust model: client only knows its own
-- visitor_id (via localStorage), so in practice it can only
-- modify "its own" rows. A determined attacker could spoof
-- visitor_ids — see header note.
drop policy if exists "anon_update_blog_reactions" on public.blog_reactions;
create policy "anon_update_blog_reactions"
  on public.blog_reactions for update
  to anon, authenticated
  using (true) with check (true);

-- DELETE — needed for "clear my reaction" UX. Same trust model
-- as UPDATE.
drop policy if exists "anon_delete_blog_reactions" on public.blog_reactions;
create policy "anon_delete_blog_reactions"
  on public.blog_reactions for delete
  to anon, authenticated
  using (true);

-- Grants for the view.
grant select on public.blog_reaction_counts to anon, authenticated;

-- ─── Smoke test (run after the above) ────────────────────────────
-- Should succeed:
--   insert into public.blog_reactions (post_slug, reaction, visitor_id)
--     values ('one-operator', 'mind', gen_random_uuid());
-- Should return one row:
--   select * from public.blog_reaction_counts where post_slug = 'one-operator';
-- Cleanup:
--   delete from public.blog_reactions where post_slug = 'one-operator';
