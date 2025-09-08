-- Setup Supabase Storage Bucket for User Avatars
-- Run this in your Supabase SQL Editor

-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket so avatars can be displayed
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all avatars" ON storage.objects;

-- Policy for authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for public access to view avatars (anyone can see avatars)
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
);

-- Optional: Add a policy to allow service role to manage all avatars (for admin operations)
CREATE POLICY "Service role can manage all avatars" ON storage.objects
FOR ALL USING (
  bucket_id = 'avatars'
  AND auth.role() = 'service_role'
); 