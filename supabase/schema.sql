-- Run this in the Supabase SQL editor for your project.

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  url text,
  created_at timestamptz not null default now()
);

-- Claudette chat
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  summary text,
  summary_until_message_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now(),
  token_count integer
);

-- summary_until_message_id FK after messages exists
do $$ begin
  alter table public.conversations
    add constraint conversations_summary_until_message_id_fkey
    foreign key (summary_until_message_id) references public.messages (id) on delete set null;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  type text not null check (type in ('pdf', 'image')),
  storage_path text not null,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists attachments_message_idx
  on public.attachments (message_id);

create index if not exists attachments_conversation_idx
  on public.attachments (conversation_id);

alter table public.todos enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;

create policy "todos: owner read" on public.todos
  for select using (auth.uid() = user_id);
create policy "todos: owner write" on public.todos
  for insert with check (auth.uid() = user_id);
create policy "todos: owner update" on public.todos
  for update using (auth.uid() = user_id);
create policy "todos: owner delete" on public.todos
  for delete using (auth.uid() = user_id);

create policy "projects: owner read" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects: owner write" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects: owner update" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects: owner delete" on public.projects
  for delete using (auth.uid() = user_id);

create policy "conversations: owner read" on public.conversations
  for select using (auth.uid() = user_id);
create policy "conversations: owner write" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "conversations: owner update" on public.conversations
  for update using (auth.uid() = user_id);
create policy "conversations: owner delete" on public.conversations
  for delete using (auth.uid() = user_id);

create policy "messages: owner read" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "messages: owner write" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "messages: owner update" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "messages: owner delete" on public.messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

create policy "attachments: owner read" on public.attachments
  for select using (auth.uid() = user_id);
create policy "attachments: owner write" on public.attachments
  for insert with check (auth.uid() = user_id);
create policy "attachments: owner update" on public.attachments
  for update using (auth.uid() = user_id);
create policy "attachments: owner delete" on public.attachments
  for delete using (auth.uid() = user_id);

-- Vehicle search tracker (private)
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  price integer,
  mileage integer,
  year integer,
  url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_user_updated_idx
  on public.vehicles (user_id, updated_at desc);

alter table public.vehicles enable row level security;

create policy "vehicles: owner read" on public.vehicles
  for select using (auth.uid() = user_id);
create policy "vehicles: owner write" on public.vehicles
  for insert with check (auth.uid() = user_id);
create policy "vehicles: owner update" on public.vehicles
  for update using (auth.uid() = user_id);
create policy "vehicles: owner delete" on public.vehicles
  for delete using (auth.uid() = user_id);

-- Background removals (private cutout tool)
create table if not exists public.bg_removals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('fast', 'quality')),
  original_path text not null,
  result_path text not null,
  original_name text,
  content_hash text,
  duration_ms integer,
  cache_hit boolean not null default false,
  failed boolean not null default false,
  created_at timestamptz not null default now()
);

-- For DBs created before analytics columns existed:
alter table public.bg_removals
  add column if not exists duration_ms integer;
alter table public.bg_removals
  add column if not exists cache_hit boolean not null default false;
alter table public.bg_removals
  add column if not exists failed boolean not null default false;

create index if not exists bg_removals_user_created_idx
  on public.bg_removals (user_id, created_at desc);

create index if not exists bg_removals_user_hash_mode_idx
  on public.bg_removals (user_id, content_hash, mode);

alter table public.bg_removals enable row level security;

create policy "bg_removals: owner read" on public.bg_removals
  for select using (auth.uid() = user_id);
create policy "bg_removals: owner write" on public.bg_removals
  for insert with check (auth.uid() = user_id);
create policy "bg_removals: owner delete" on public.bg_removals
  for delete using (auth.uid() = user_id);

-- Public site settings (singleton) - readable by everyone, writable when logged in
create table if not exists public.site_settings (
  id text primary key default 'default' check (id = 'default'),
  relationship_status text not null default 'single'
    check (relationship_status in ('single', 'dating')),
  single_since date not null default '2026-02-01',
  louis_joke_mode boolean not null default false,
  now_playing_title text,
  now_playing_artist text,
  now_playing_url text,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "site_settings: public read" on public.site_settings
  for select using (true);

create policy "site_settings: auth update" on public.site_settings
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "site_settings: auth insert" on public.site_settings
  for insert with check (auth.uid() is not null);

insert into public.site_settings (id, relationship_status, single_since)
values ('default', 'single', '2026-02-01')
on conflict (id) do nothing;

-- Claudette personal settings + profile (private, per user)
create table if not exists public.claudette_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  web_search_enabled boolean not null default true,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.claudette_settings enable row level security;

create policy "claudette_settings: owner read" on public.claudette_settings
  for select using (auth.uid() = user_id);
create policy "claudette_settings: owner insert" on public.claudette_settings
  for insert with check (auth.uid() = user_id);
create policy "claudette_settings: owner update" on public.claudette_settings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "claudette_settings: owner delete" on public.claudette_settings
  for delete using (auth.uid() = user_id);

-- Storage bucket for Claudette attachments (private).
-- Create in Dashboard or via:
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

create policy "chat-attachments: owner read"
  on storage.objects for select
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-attachments: owner insert"
  on storage.objects for insert
  with check (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-attachments: owner update"
  on storage.objects for update
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat-attachments: owner delete"
  on storage.objects for delete
  using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage for cutout originals + transparent PNGs (private).
insert into storage.buckets (id, name, public)
values ('bg-removals', 'bg-removals', false)
on conflict (id) do nothing;

create policy "bg-removals: owner read"
  on storage.objects for select
  using (bucket_id = 'bg-removals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "bg-removals: owner insert"
  on storage.objects for insert
  with check (bucket_id = 'bg-removals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "bg-removals: owner update"
  on storage.objects for update
  using (bucket_id = 'bg-removals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "bg-removals: owner delete"
  on storage.objects for delete
  using (bucket_id = 'bg-removals' and (storage.foldername(name))[1] = auth.uid()::text);

-- RSS/Atom reader (public read; writes via service role / authenticated read marks)
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

alter table public.feeds enable row level security;
alter table public.feed_items enable row level security;

create policy "feeds: public read" on public.feeds
  for select using (true);

create policy "feed_items: public read" on public.feed_items
  for select using (true);

create policy "feed_items: auth update read" on public.feed_items
  for update
  to authenticated
  using (true)
  with check (true);
