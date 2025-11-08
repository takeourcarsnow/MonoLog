-- Add liked_stories column to users table for story likes
-- Run in Supabase SQL editor

alter table public.users add column if not exists liked_stories text[] default '{}';