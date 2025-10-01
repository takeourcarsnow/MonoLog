-- Complete diagnostic and fix for MonoLog RLS issues
-- Run this entire script in Supabase SQL Editor

-- =============================================
-- STEP 1: DIAGNOSTIC - Check current state
-- =============================================

-- Check if RLS is enabled on posts table
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'posts';

-- List all policies on posts table
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    permissive as "Permissive",
    qual as "USING clause",
    with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'posts';

-- Check if RLS is enabled on storage.objects
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- List all policies on storage.objects for 'posts' bucket
SELECT 
    policyname as "Policy Name",
    cmd as "Command",
    permissive as "Permissive"
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =============================================
-- STEP 2: FIX - Disable RLS on posts table
-- =============================================

-- Disable RLS on posts table (simplest fix for your architecture)
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 3: FIX - Update storage policies
-- =============================================

-- Drop old storage policies
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_3" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own folder files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own folder files" ON storage.objects;

-- Create new storage policies
-- Public read for all images in posts bucket
CREATE POLICY "Public read access for posts bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

-- Allow authenticated users to upload to their own user folder
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update files in their own folder
CREATE POLICY "Authenticated users can update own folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete files in their own folder
CREATE POLICY "Authenticated users can delete own folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- STEP 4: VERIFICATION - Check final state
-- =============================================

-- Verify posts table RLS is disabled
SELECT 
    tablename, 
    rowsecurity as "RLS Enabled (should be FALSE)"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'posts';

-- Verify storage policies
SELECT 
    policyname as "Policy Name",
    cmd as "Command"
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Done! Now try uploading and viewing a post in your app.
