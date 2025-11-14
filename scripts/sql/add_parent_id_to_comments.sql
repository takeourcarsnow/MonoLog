-- Add parent_id column to comments table for threaded comments
-- Run this in Supabase SQL editor if the column is missing

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);