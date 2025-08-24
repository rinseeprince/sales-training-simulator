-- Fix Scenarios Table Columns
-- This script ensures all required columns exist in the scenarios table

-- First, let's see what columns currently exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scenarios' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add industry column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scenarios' AND column_name = 'industry'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN industry TEXT;
        RAISE NOTICE 'Added industry column to scenarios table';
    END IF;

    -- Add persona column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scenarios' AND column_name = 'persona'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN persona TEXT;
        RAISE NOTICE 'Added persona column to scenarios table';
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scenarios' AND column_name = 'tags'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column to scenarios table';
    END IF;

    -- Add settings column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scenarios' AND column_name = 'settings'
    ) THEN
        ALTER TABLE scenarios ADD COLUMN settings JSONB DEFAULT '{}';
        RAISE NOTICE 'Added settings column to scenarios table';
    END IF;
END $$;

-- Show the final table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'scenarios' 
ORDER BY ordinal_position;
