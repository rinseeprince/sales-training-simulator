-- Fix Scenarios Table for Prompt-Only System with Duration and Voice
-- This aligns the table with the new prompt-only AI prospect system

-- First, drop the NOT NULL constraint on name if it exists
ALTER TABLE scenarios ALTER COLUMN name DROP NOT NULL;

-- Add the columns that the current API expects
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS voice TEXT;

-- Copy existing data if needed
UPDATE scenarios SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE scenarios SET prompt = description WHERE prompt IS NULL AND description IS NOT NULL;

-- Make title NOT NULL after copying data
ALTER TABLE scenarios ALTER COLUMN title SET NOT NULL;

-- Show what columns we have now
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'scenarios' 
ORDER BY ordinal_position;
