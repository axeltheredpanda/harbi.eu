-- News items from curated RSS/Atom feeds
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  feed_id text not null,
  guid text not null,
  title text not null,
  url text not null,
  source_name text not null,
  summary text,
  published_at timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (feed_id, guid)
);

create index if not exists news_items_published_idx
  on public.news_items (published_at desc nulls last);

create index if not exists news_items_tags_idx
  on public.news_items using gin (tags);

alter table public.news_items enable row level security;

drop policy if exists "news_items: public read" on public.news_items;
create policy "news_items: public read" on public.news_items
  for select using (true);

-- Writes go through the service role (cron / sync API), which bypasses RLS.
