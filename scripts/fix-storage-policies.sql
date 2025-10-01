-- Fix storage policies for MonoLog app
-- Problem: Service role uploads don't set owner automatically, breaking RLS policies

-- First, drop the existing public policies
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_2" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert into posts objects trmsfz_3" ON storage.objects;

-- IMPORTANT: Your app uploads via service role (/api/storage/upload uses getServiceSupabase)
-- Service role bypasses RLS, so these policies mainly control CLIENT-SIDE access

-- Option 1: Public read (recommended for social media app like MonoLog)
-- Anyone can view post images, but only authenticated users with matching path prefix can manage
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

-- Option 2: Authenticated read only (uncomment if you want private posts)
-- CREATE POLICY "Authenticated users can view post images"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'posts' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to insert files into their own user folder (userId prefix)
-- This checks the path starts with {userId}/ to ensure users can only upload to their folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update files in their own folder
CREATE POLICY "Users can update their own folder files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete files in their own folder
CREATE POLICY "Users can delete their own folder files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.uid() IS NOT NULL 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: Since your server uploads via service role, these policies won't affect server-side
-- uploads (service role bypasses RLS). They control direct client access if you ever add that.
