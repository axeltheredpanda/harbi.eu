-- Personal analytics / usage report
-- Run in Supabase SQL Editor. Safe to re-run.

-- Per Claude API turn (one row per streamed reply)
create table if not exists public.claude_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cache_creation_tokens integer,
  cache_read_tokens integer,
  ttft_ms integer,
  total_ms integer,
  web_search boolean not null default false,
  aborted boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists claude_usage_user_created_idx
  on public.claude_usage (user_id, created_at desc);

create index if not exists claude_usage_conversation_idx
  on public.claude_usage (conversation_id);

-- Generic service events (errors, timeouts, successes worth logging)
create table if not exists public.service_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  service text not null check (service in ('claude', 'cutout', 'news', 'other')),
  kind text not null check (kind in ('success', 'error', 'timeout', 'info')),
  detail text,
  duration_ms integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_events_service_created_idx
  on public.service_events (service, created_at desc);

-- Conversation topic label (lightweight auto-tag)
alter table public.conversations
  add column if not exists topic text;

alter table public.conversations
  add column if not exists topic_at timestamptz;

-- Cutout timing / cache (client ONNX — no HF Space)
alter table public.bg_removals
  add column if not exists duration_ms integer;

alter table public.bg_removals
  add column if not exists cache_hit boolean not null default false;

alter table public.bg_removals
  add column if not exists failed boolean not null default false;

alter table public.claude_usage enable row level security;
alter table public.service_events enable row level security;

drop policy if exists "claude_usage: owner select" on public.claude_usage;
create policy "claude_usage: owner select" on public.claude_usage
  for select using (auth.uid() = user_id);

drop policy if exists "claude_usage: owner insert" on public.claude_usage;
create policy "claude_usage: owner insert" on public.claude_usage
  for insert with check (auth.uid() = user_id);

drop policy if exists "service_events: owner select" on public.service_events;
create policy "service_events: owner select" on public.service_events
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "service_events: owner insert" on public.service_events;
create policy "service_events: owner insert" on public.service_events
  for insert with check (auth.uid() = user_id or user_id is null);
