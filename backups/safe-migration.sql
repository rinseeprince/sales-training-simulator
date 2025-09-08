-- Safe Migration Script for Avatar Feature
-- Run these one at a time in Supabase SQL Editor

-- Step 1: Check if avatar_url column already exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'simple_users' 
AND column_name = 'avatar_url';

-- Step 2: Add avatar_url column (only if it doesn't exist)
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 3: Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'simple_users' 
AND column_name = 'avatar_url';

-- Step 4: Create avatars storage bucket (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Step 5: Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'avatars';
