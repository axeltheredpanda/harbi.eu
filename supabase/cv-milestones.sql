-- CV timeline milestones (public horizontal CV + Settings CRUD)
-- Run in Supabase SQL Editor. Safe to re-run.
-- sort_order ascending = left → right chronological on the landing track.

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
create table if not exists public.cv_milestones (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  title_fr text not null,
  title_en text not null,
  place_fr text not null default '',
  place_en text not null default '',
  summary_fr text not null,
  summary_en text not null,
  image_path text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cv_milestones_sort_idx
  on public.cv_milestones (sort_order asc, created_at asc);

create index if not exists cv_milestones_published_sort_idx
  on public.cv_milestones (published, sort_order asc)
  where published = true;

alter table public.cv_milestones enable row level security;

drop policy if exists "cv_milestones: public read published" on public.cv_milestones;
drop policy if exists "cv_milestones: auth select" on public.cv_milestones;
drop policy if exists "cv_milestones: auth insert" on public.cv_milestones;
drop policy if exists "cv_milestones: auth update" on public.cv_milestones;
drop policy if exists "cv_milestones: auth delete" on public.cv_milestones;

-- Anon / public: published rows only
create policy "cv_milestones: public read published" on public.cv_milestones
  for select
  using (published = true);

-- Authenticated: full read (drafts) + write
create policy "cv_milestones: auth select" on public.cv_milestones
  for select
  to authenticated
  using (true);

create policy "cv_milestones: auth insert" on public.cv_milestones
  for insert
  to authenticated
  with check (true);

create policy "cv_milestones: auth update" on public.cv_milestones
  for update
  to authenticated
  using (true)
  with check (true);

create policy "cv_milestones: auth delete" on public.cv_milestones
  for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2) Storage bucket (public read for logos on landing)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('cv-milestones', 'cv-milestones', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "cv-milestones: public read" on storage.objects;
drop policy if exists "cv-milestones: auth insert" on storage.objects;
drop policy if exists "cv-milestones: auth update" on storage.objects;
drop policy if exists "cv-milestones: auth delete" on storage.objects;

create policy "cv-milestones: public read"
  on storage.objects for select
  using (bucket_id = 'cv-milestones');

create policy "cv-milestones: auth insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cv-milestones');

create policy "cv-milestones: auth update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'cv-milestones')
  with check (bucket_id = 'cv-milestones');

create policy "cv-milestones: auth delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cv-milestones');
