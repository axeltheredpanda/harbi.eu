-- Jarvis second-brain (private notes + RAG + daily briefing)
-- Safe to re-run. Paste in Supabase SQL Editor after enabling pgvector.
--
-- No Storage bucket: notes live in Postgres (unlike chat-attachments /
-- bg-removals / cv-milestones). RLS naming matches schema.sql tables
-- ("notes: owner read") and Storage-style ownership via auth.uid().
--
-- Prerequisites:
--   1) Enable extension "vector" (Dashboard → Database → Extensions), OR
--      the create extension line below.
--   2) Run this whole file.

-- ---------------------------------------------------------------------------
-- Extension (Supabase: install into schema "extensions")
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  content_hash text,
  processed_hash text,
  embedding extensions.vector(512),
  auto_tags text[] not null default '{}',
  auto_summary text,
  is_daily_note boolean not null default false,
  daily_note_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns if an earlier partial run created a thinner table
alter table public.notes add column if not exists title text;
alter table public.notes add column if not exists content text;
alter table public.notes add column if not exists content_hash text;
alter table public.notes add column if not exists processed_hash text;
alter table public.notes add column if not exists embedding extensions.vector(512);
alter table public.notes add column if not exists auto_tags text[];
alter table public.notes add column if not exists auto_summary text;
alter table public.notes add column if not exists is_daily_note boolean;
alter table public.notes add column if not exists daily_note_date date;
alter table public.notes add column if not exists created_at timestamptz;
alter table public.notes add column if not exists updated_at timestamptz;

alter table public.notes alter column title set default 'Untitled';
alter table public.notes alter column content set default '';
alter table public.notes alter column auto_tags set default '{}';
alter table public.notes alter column is_daily_note set default false;
alter table public.notes alter column created_at set default now();
alter table public.notes alter column updated_at set default now();

update public.notes set title = 'Untitled' where title is null;
update public.notes set content = '' where content is null;
update public.notes set auto_tags = '{}' where auto_tags is null;
update public.notes set is_daily_note = false where is_daily_note is null;
update public.notes set created_at = now() where created_at is null;
update public.notes set updated_at = now() where updated_at is null;

create unique index if not exists notes_user_daily_date_uidx
  on public.notes (user_id, daily_note_date)
  where is_daily_note = true and daily_note_date is not null;

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists notes_user_title_idx
  on public.notes (user_id, lower(title));

-- Full-text search generated column (must exist BEFORE the GIN index)
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notes'
      and column_name = 'fts'
  ) then
    alter table public.notes
      add column fts tsvector
      generated always as (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(auto_summary, '')), 'C')
      ) stored;
  end if;
end $$;

create index if not exists notes_fts_idx on public.notes using gin (fts);

-- Vector index (cosine). HNSW suits a small personal corpus.
create index if not exists notes_embedding_hnsw_idx
  on public.notes
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.notes enable row level security;

-- Drop legacy + current names so re-runs stay clean
drop policy if exists "notes: owner select" on public.notes;
drop policy if exists "notes: owner insert" on public.notes;
drop policy if exists "notes: owner read" on public.notes;
drop policy if exists "notes: owner write" on public.notes;
drop policy if exists "notes: owner update" on public.notes;
drop policy if exists "notes: owner delete" on public.notes;

-- Same pattern as todos / projects / bg_removals (auth.uid() = user_id)
create policy "notes: owner read" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes: owner write" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes: owner update" on public.notes
  for update using (auth.uid() = user_id);
create policy "notes: owner delete" on public.notes
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Wiki-style links
-- ---------------------------------------------------------------------------
create table if not exists public.note_links (
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_note_id uuid not null references public.notes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_note_id, target_note_id),
  check (source_note_id <> target_note_id)
);

create index if not exists note_links_target_idx
  on public.note_links (target_note_id);

alter table public.note_links enable row level security;

drop policy if exists "note_links: owner select" on public.note_links;
drop policy if exists "note_links: owner insert" on public.note_links;
drop policy if exists "note_links: owner read" on public.note_links;
drop policy if exists "note_links: owner write" on public.note_links;
drop policy if exists "note_links: owner delete" on public.note_links;

-- Ownership via parent note (same idea as messages → conversations)
create policy "note_links: owner read" on public.note_links
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  );
create policy "note_links: owner write" on public.note_links
  for insert with check (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  );
create policy "note_links: owner delete" on public.note_links
  for delete using (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Daily briefings (one per user per day)
-- Written by service role cron (bypasses RLS); readable by owner.
-- ---------------------------------------------------------------------------
create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  briefing_date date not null,
  content text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create index if not exists daily_briefings_user_date_idx
  on public.daily_briefings (user_id, briefing_date desc);

alter table public.daily_briefings enable row level security;

drop policy if exists "daily_briefings: owner select" on public.daily_briefings;
drop policy if exists "daily_briefings: owner insert" on public.daily_briefings;
drop policy if exists "daily_briefings: owner read" on public.daily_briefings;
drop policy if exists "daily_briefings: owner write" on public.daily_briefings;
drop policy if exists "daily_briefings: owner update" on public.daily_briefings;
drop policy if exists "daily_briefings: owner delete" on public.daily_briefings;

create policy "daily_briefings: owner read" on public.daily_briefings
  for select using (auth.uid() = user_id);
create policy "daily_briefings: owner write" on public.daily_briefings
  for insert with check (auth.uid() = user_id);
create policy "daily_briefings: owner update" on public.daily_briefings
  for update using (auth.uid() = user_id);
create policy "daily_briefings: owner delete" on public.daily_briefings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Hybrid search RPC (vector + FTS, merged)
-- ---------------------------------------------------------------------------
create or replace function public.match_notes(
  query_embedding extensions.vector(512),
  query_text text,
  match_user_id uuid,
  match_count int default 8
)
returns table (
  id uuid,
  title text,
  content text,
  auto_summary text,
  auto_tags text[],
  updated_at timestamptz,
  score double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with semantic as (
    select
      n.id,
      n.title,
      n.content,
      n.auto_summary,
      n.auto_tags,
      n.updated_at,
      (1 - (n.embedding <=> query_embedding))::double precision as sem_score
    from public.notes n
    where n.user_id = match_user_id
      and n.embedding is not null
    order by n.embedding <=> query_embedding
    limit greatest(match_count * 2, 12)
  ),
  lexical as (
    select
      n.id,
      n.title,
      n.content,
      n.auto_summary,
      n.auto_tags,
      n.updated_at,
      ts_rank_cd(n.fts, websearch_to_tsquery('english', query_text))::double precision as lex_score
    from public.notes n
    where n.user_id = match_user_id
      and query_text is not null
      and length(trim(query_text)) > 0
      and n.fts @@ websearch_to_tsquery('english', query_text)
    order by lex_score desc
    limit greatest(match_count * 2, 12)
  ),
  merged as (
    select
      coalesce(s.id, l.id) as id,
      coalesce(s.title, l.title) as title,
      coalesce(s.content, l.content) as content,
      coalesce(s.auto_summary, l.auto_summary) as auto_summary,
      coalesce(s.auto_tags, l.auto_tags) as auto_tags,
      coalesce(s.updated_at, l.updated_at) as updated_at,
      (coalesce(s.sem_score, 0) * 0.7 + coalesce(l.lex_score, 0) * 0.3)::double precision as score
    from semantic s
    full outer join lexical l on s.id = l.id
  )
  select *
  from merged
  order by score desc
  limit match_count;
$$;

revoke all on function public.match_notes(
  extensions.vector(512), text, uuid, int
) from public;
grant execute on function public.match_notes(
  extensions.vector(512), text, uuid, int
) to authenticated;
grant execute on function public.match_notes(
  extensions.vector(512), text, uuid, int
) to service_role;
