-- Check user search issue
-- Run this in your Supabase SQL Editor

-- 1. Check all users in the taboola.com domain
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  email_verified,
  created_at
FROM simple_users
WHERE email LIKE '%@taboola.com%'
ORDER BY email;

-- 2. Check if there are any issues with the name field
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN name IS NULL THEN 'NULL'
    WHEN name = '' THEN 'EMPTY'
    ELSE 'HAS_VALUE'
  END as name_status
FROM simple_users
WHERE email LIKE '%@taboola.com%';

-- 3. Update empty/null names to use email prefix
UPDATE simple_users
SET 
  name = COALESCE(
    NULLIF(name, ''), 
    split_part(email, '@', 1)
  ),
  updated_at = NOW()
WHERE email LIKE '%@taboola.com%'
  AND (name IS NULL OR name = '');

-- 4. Verify the update
SELECT 
  id,
  email,
  name,
  role,
  email_verified
FROM simple_users
WHERE email LIKE '%@taboola.com%'
ORDER BY email;

-- 5. Test the search query that the API uses
-- This simulates searching for "sa" in the taboola.com domain
SELECT 
  id,
  name,
  email,
  role,
  email_verified
FROM simple_users
WHERE email LIKE '%@taboola.com%'
  AND (
    email ILIKE '%sa%' 
    OR name ILIKE '%sa%'
  )
ORDER BY email
LIMIT 20;

-- 6. Alternative: Set email_verified to true for all taboola.com users
-- (Uncomment if needed)
-- UPDATE simple_users
-- SET 
--   email_verified = true,
--   updated_at = NOW()
-- WHERE email LIKE '%@taboola.com%'; 