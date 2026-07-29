-- Now playing widget on the public landing banner
-- Run in Supabase SQL editor after deploy.

alter table public.site_settings
  add column if not exists now_playing_title text,
  add column if not exists now_playing_artist text,
  add column if not exists now_playing_url text;

comment on column public.site_settings.now_playing_title is
  'Track title for the public landing “now playing” widget';
comment on column public.site_settings.now_playing_artist is
  'Artist for the public landing “now playing” widget';
comment on column public.site_settings.now_playing_url is
  'Link (YouTube, Spotify, …) for the public landing “now playing” widget';
