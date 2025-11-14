-- Add missing columns to notifications table for comments and stories
-- Run this in Supabase SQL editor

-- Add comment_id column for comment notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS comment_id uuid;

-- Add story_id column for story-related notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS story_id uuid;

-- Add thread_id column for thread-related notifications (if not already present)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS thread_id uuid;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS notifications_comment_id_idx ON public.notifications(comment_id);
CREATE INDEX IF NOT EXISTS notifications_story_id_idx ON public.notifications(story_id);
CREATE INDEX IF NOT EXISTS notifications_thread_id_idx ON public.notifications(thread_id);