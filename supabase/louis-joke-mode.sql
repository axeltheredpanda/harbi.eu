-- Louis joke mode flag on site_settings
-- Run in Supabase SQL Editor. Safe to re-run.

alter table public.site_settings
  add column if not exists louis_joke_mode boolean not null default false;

comment on column public.site_settings.louis_joke_mode is
  'When true: login quiz for Louis + Claudette send blocked for his account.';
