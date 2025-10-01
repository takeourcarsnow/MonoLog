-- Fix posts table RLS policies for MonoLog
-- Problem: Posts created via service role can't be read by authenticated users

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'posts';

-- List current policies on posts table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'posts';

-- =============================================
-- RECOMMENDED SETUP FOR SOCIAL MEDIA APP
-- =============================================

-- Option A: Disable RLS entirely on posts table (simplest for social media)
-- This allows all authenticated users to read/write posts
-- Your app logic already controls access via server endpoints
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- Option B: Enable RLS with permissive policies (more secure)
-- Uncomment the section below if you want RLS enabled:

/*
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON posts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON posts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON posts;

-- Allow all authenticated users to read public posts
CREATE POLICY "Authenticated users can read public posts"
ON posts FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (public = true OR user_id = auth.uid())
);

-- Allow authenticated users to insert their own posts
CREATE POLICY "Users can insert their own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow users to update only their own posts
CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Allow users to delete only their own posts
CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);
*/

-- =============================================
-- IMPORTANT NOTES:
-- =============================================
-- 1. Your app creates posts via /api/posts/create which uses service role
--    Service role bypasses RLS, so posts ARE created successfully
-- 2. The problem is READING posts after creation
-- 3. Option A (disable RLS) is simplest and works since your API endpoints
--    already handle authorization
-- 4. Option B (enable RLS) provides database-level security but requires
--    your client to be authenticated when reading posts
