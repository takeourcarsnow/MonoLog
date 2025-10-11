-- Add EXIF columns to the posts table
-- Run this SQL in your Supabase SQL Editor or database console

-- Add camera column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS camera TEXT;

-- Add lens column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS lens TEXT;

-- Add film_type column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS film_type TEXT;

-- Optional: Add indexes for better query performance on EXIF data
CREATE INDEX IF NOT EXISTS idx_posts_camera ON posts(camera);
CREATE INDEX IF NOT EXISTS idx_posts_lens ON posts(lens);
CREATE INDEX IF NOT EXISTS idx_posts_film_type ON posts(film_type);