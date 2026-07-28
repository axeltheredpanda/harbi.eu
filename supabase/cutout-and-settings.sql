-- Cutout (rembg) + relationship settings
-- Run once in Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Background removals (Cutout history)
-- ---------------------------------------------------------------------------
create table if not exists public.bg_removals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('fast', 'quality')),
  original_path text not null,
  result_path text not null,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists bg_removals_user_created_idx
  on public.bg_removals (user_id, created_at desc);

alter table public.bg_removals enable row level security;

drop policy if exists "bg_removals: owner read" on public.bg_removals;
drop policy if exists "bg_removals: owner write" on public.bg_removals;
drop policy if exists "bg_removals: owner delete" on public.bg_removals;

create policy "bg_removals: owner read" on public.bg_removals
  for select using (auth.uid() = user_id);
create policy "bg_removals: owner write" on public.bg_removals
  for insert with check (auth.uid() = user_id);
create policy "bg_removals: owner delete" on public.bg_removals
  for delete using (auth.uid() = user_id);

-- Storage bucket for originals + transparent PNGs
insert into storage.buckets (id, name, public)
values ('bg-removals', 'bg-removals', false)
on conflict (id) do nothing;

drop policy if exists "bg-removals: owner read" on storage.objects;
drop policy if exists "bg-removals: owner insert" on storage.objects;
drop policy if exists "bg-removals: owner update" on storage.objects;
drop policy if exists "bg-removals: owner delete" on storage.objects;

create policy "bg-removals: owner read"
  on storage.objects for select
  using (
    bucket_id = 'bg-removals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bg-removals: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'bg-removals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bg-removals: owner update"
  on storage.objects for update
  using (
    bucket_id = 'bg-removals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bg-removals: owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'bg-removals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 2) Site settings (relationship status on public banner)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id text primary key default 'default' check (id = 'default'),
  relationship_status text not null default 'single'
    check (relationship_status in ('single', 'dating')),
  single_since date not null default '2026-02-01',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings: public read" on public.site_settings;
drop policy if exists "site_settings: auth update" on public.site_settings;
drop policy if exists "site_settings: auth insert" on public.site_settings;

-- Anyone (incl. anon) can read — needed for the public landing banner
create policy "site_settings: public read" on public.site_settings
  for select using (true);

-- Logged-in user can insert / update the singleton row
create policy "site_settings: auth insert" on public.site_settings
  for insert with check (auth.uid() is not null);

create policy "site_settings: auth update" on public.site_settings
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);

insert into public.site_settings (id, relationship_status, single_since)
values ('default', 'single', '2026-02-01')
on conflict (id) do nothing;
