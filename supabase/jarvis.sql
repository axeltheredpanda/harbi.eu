-- Jarvis second-brain (private notes + RAG + daily briefing)
-- Run in Supabase SQL Editor. Safe to re-run.
-- Requires: pgvector (Database → Extensions → vector)

create extension if not exists vector;

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
  embedding vector(512),
  auto_tags text[] not null default '{}',
  auto_summary text,
  is_daily_note boolean not null default false,
  daily_note_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notes_user_daily_date_uidx
  on public.notes (user_id, daily_note_date)
  where is_daily_note = true and daily_note_date is not null;

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create index if not exists notes_user_title_idx
  on public.notes (user_id, lower(title));

-- For DBs that already created notes without processed_hash:
alter table public.notes
  add column if not exists processed_hash text;

-- Full-text search column (must exist before the GIN index below)
alter table public.notes
  add column if not exists fts tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(auto_summary, '')), 'C')
  ) stored;

create index if not exists notes_fts_idx on public.notes using gin (fts);

-- Vector index (cosine). HNSW works well for small personal corpora.
create index if not exists notes_embedding_hnsw_idx
  on public.notes
  using hnsw (embedding vector_cosine_ops);

alter table public.notes enable row level security;

drop policy if exists "notes: owner select" on public.notes;
drop policy if exists "notes: owner insert" on public.notes;
drop policy if exists "notes: owner update" on public.notes;
drop policy if exists "notes: owner delete" on public.notes;

create policy "notes: owner select" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes: owner insert" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes: owner update" on public.notes
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
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
drop policy if exists "note_links: owner delete" on public.note_links;

create policy "note_links: owner select" on public.note_links
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  );

create policy "note_links: owner insert" on public.note_links
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
drop policy if exists "daily_briefings: owner update" on public.daily_briefings;
drop policy if exists "daily_briefings: owner delete" on public.daily_briefings;

create policy "daily_briefings: owner select" on public.daily_briefings
  for select using (auth.uid() = user_id);
create policy "daily_briefings: owner insert" on public.daily_briefings
  for insert with check (auth.uid() = user_id);
create policy "daily_briefings: owner update" on public.daily_briefings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "daily_briefings: owner delete" on public.daily_briefings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Hybrid search RPC (vector + FTS, merged)
-- ---------------------------------------------------------------------------
create or replace function public.match_notes(
  query_embedding vector(512),
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

revoke all on function public.match_notes from public;
grant execute on function public.match_notes to authenticated;
grant execute on function public.match_notes to service_role;
