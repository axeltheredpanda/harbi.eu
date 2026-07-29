-- RSS/Atom reader: feeds + feed_items
-- Run in Supabase SQL Editor. Safe to re-run.
-- Replaces the older flat news_items table (dropped below if present).

create table if not exists public.feeds (
  id text primary key,
  url text not null,
  name text not null,
  favicon_url text,
  last_fetched_at timestamptz,
  status text not null default 'ok'
    check (status in ('ok', 'unreachable')),
  consecutive_failures integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.feed_items (
  id uuid primary key default gen_random_uuid(),
  feed_id text not null references public.feeds (id) on delete cascade,
  guid text not null,
  title text not null,
  url text not null,
  published_at timestamptz,
  content_snippet text,
  full_content text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (feed_id, guid)
);

create index if not exists feed_items_published_idx
  on public.feed_items (published_at desc nulls last);

create index if not exists feed_items_feed_id_idx
  on public.feed_items (feed_id);

create index if not exists feed_items_unread_idx
  on public.feed_items (read_at nulls first, published_at desc);

alter table public.feeds enable row level security;
alter table public.feed_items enable row level security;

drop policy if exists "feeds: public read" on public.feeds;
create policy "feeds: public read" on public.feeds
  for select using (true);

drop policy if exists "feed_items: public read" on public.feed_items;
create policy "feed_items: public read" on public.feed_items
  for select using (true);

-- Authenticated owner can mark items read / unread
drop policy if exists "feed_items: auth update read" on public.feed_items;
create policy "feed_items: auth update read" on public.feed_items
  for update
  to authenticated
  using (true)
  with check (true);

-- Legacy flat table (optional cleanup)
drop table if exists public.news_items;
