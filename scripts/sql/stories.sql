-- SQL schema for Stories feature (24h ephemeral media)
-- Run these statements in Supabase SQL editor.

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

create table if not exists public.stories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  media_url text not null,
  thumbnail_url text,
  media_type text not null check (media_type in ('image','video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  view_count int not null default 0,
  viewers_json jsonb,
  duration_seconds int
);

create index if not exists stories_user_expires_idx on public.stories(user_id, expires_at desc);
create index if not exists stories_expires_idx on public.stories(expires_at);

-- View tracking (distinct viewers)
create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists story_views_user_idx on public.story_views(user_id, viewed_at desc);

-- (Optional) policy examples; adjust for your RLS model
-- alter table public.stories enable row level security;
-- create policy "stories_insert_own" on public.stories for insert with check (auth.uid() = user_id);
-- create policy "stories_select_all" on public.stories for select using (true);
-- create policy "stories_delete_own" on public.stories for delete using (auth.uid() = user_id);
