-- Setup Supabase Storage Bucket for Call Audio
-- Run this in your Supabase SQL Editor

-- Create the call-audio bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-audio',
  'call-audio',
  true,
  10485760,
  ARRAY['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload audio files
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'call-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy for users to view their own audio files
CREATE POLICY "Users can view their own audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'call-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for public access to audio files (for playback)
CREATE POLICY "Public access to audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'call-audio'
);

-- Update bucket CORS settings
UPDATE storage.buckets 
SET cors_origins = ARRAY['*']
WHERE id = 'call-audio';

-- Enable public access to the bucket
UPDATE storage.buckets 
SET public = true
WHERE id = 'call-audio';
