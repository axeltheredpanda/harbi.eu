-- Claudette UX: long-term memories + conversation branching
-- Safe to re-run. Paste in Supabase SQL Editor after schema.sql.

-- ---------------------------------------------------------------------------
-- Memories (durable facts extracted async from conversations)
-- ---------------------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null
    check (category in (
      'personal',
      'projects',
      'preferences',
      'ongoing',
      'other'
    )),
  title text not null,
  content text not null,
  -- Sensitive categories (health, precise finances, etc.) stay out of auto-inject
  -- until the user explicitly pins them.
  sensitive boolean not null default false,
  pinned boolean not null default false,
  source_conversation_id uuid references public.conversations (id) on delete set null,
  last_touched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memories_user_category_idx
  on public.memories (user_id, category);

create index if not exists memories_user_touched_idx
  on public.memories (user_id, last_touched_at desc);

alter table public.memories enable row level security;

drop policy if exists "memories: owner read" on public.memories;
drop policy if exists "memories: owner write" on public.memories;
drop policy if exists "memories: owner update" on public.memories;
drop policy if exists "memories: owner delete" on public.memories;

create policy "memories: owner read" on public.memories
  for select using (auth.uid() = user_id);
create policy "memories: owner write" on public.memories
  for insert with check (auth.uid() = user_id);
create policy "memories: owner update" on public.memories
  for update using (auth.uid() = user_id);
create policy "memories: owner delete" on public.memories
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Message branching (tree via parent_id; active path tip on conversation)
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists parent_id uuid references public.messages (id) on delete set null;

create index if not exists messages_conversation_parent_idx
  on public.messages (conversation_id, parent_id);

alter table public.conversations
  add column if not exists active_leaf_id uuid references public.messages (id) on delete set null;

-- Backfill parent_id only for fully-linear (never branched) conversations
with unmigrated as (
  select conversation_id
  from public.messages
  group by conversation_id
  having bool_and(parent_id is null) and count(*) > 1
),
ordered as (
  select
    m.id,
    lag(m.id) over (
      partition by m.conversation_id
      order by m.created_at asc, m.id asc
    ) as prev_id
  from public.messages m
  join unmigrated u on u.conversation_id = m.conversation_id
)
update public.messages m
set parent_id = o.prev_id
from ordered o
where m.id = o.id
  and o.prev_id is not null
  and m.parent_id is null;

-- Set active leaf to latest message per conversation when unset
update public.conversations c
set active_leaf_id = (
  select m.id
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
)
where c.active_leaf_id is null
  and exists (
    select 1 from public.messages m where m.conversation_id = c.id
  );
