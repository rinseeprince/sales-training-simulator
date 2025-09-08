-- Database Backup Queries for RepScore
-- Run these in your Supabase SQL Editor and save the results

-- 1. Export simple_users table
SELECT * FROM simple_users;

-- 2. Export scenarios table  
SELECT * FROM scenarios;

-- 3. Export calls table
SELECT * FROM calls;

-- 4. Export any other tables you might have
-- SELECT * FROM user_usage;
-- SELECT * FROM business_models;

-- 5. Check current table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('simple_users', 'scenarios', 'calls')
ORDER BY table_name, ordinal_position;

-- 6. Check if avatar_url column already exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'simple_users' 
AND column_name = 'avatar_url';
