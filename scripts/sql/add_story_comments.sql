-- Add story_id column to comments table to allow comments on stories
-- Run this in Supabase SQL editor

ALTER TABLE public.comments ADD COLUMN story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS comments_story_id_idx ON public.comments(story_id);

-- Optional: Add constraint to ensure either post_id or story_id is set, but not both (or allow both if needed)
-- For now, allow both to be null or set, but perhaps add check later if needed