-- Claudette settings + profile (run in Supabase SQL Editor)
-- Safe to re-run.

create table if not exists public.claudette_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  web_search_enabled boolean not null default true,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.claudette_settings enable row level security;

drop policy if exists "claudette_settings: owner read" on public.claudette_settings;
drop policy if exists "claudette_settings: owner insert" on public.claudette_settings;
drop policy if exists "claudette_settings: owner update" on public.claudette_settings;
drop policy if exists "claudette_settings: owner delete" on public.claudette_settings;

create policy "claudette_settings: owner read" on public.claudette_settings
  for select using (auth.uid() = user_id);
create policy "claudette_settings: owner insert" on public.claudette_settings
  for insert with check (auth.uid() = user_id);
create policy "claudette_settings: owner update" on public.claudette_settings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "claudette_settings: owner delete" on public.claudette_settings
  for delete using (auth.uid() = user_id);
