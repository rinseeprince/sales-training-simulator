-- Fix Calls Table - Add Missing Columns
-- Run this in your Supabase SQL Editor

-- Add missing columns to calls table if they don't exist
ALTER TABLE calls ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS audio_file_size INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS scenario_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcript JSONB DEFAULT '[]';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS talk_ratio DECIMAL;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS objections_handled INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS cta_used BOOLEAN;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS feedback TEXT[];
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Show current calls table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;
