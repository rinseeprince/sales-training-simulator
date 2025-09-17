-- Check and update user role to admin
-- Run this in your Supabase SQL Editor

-- First, let's check the current user data for samuel.k@taboola.com
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  created_at,
  updated_at
FROM simple_users
WHERE email = 'samuel.k@taboola.com';

-- Update the user role to admin
UPDATE simple_users
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email = 'samuel.k@taboola.com';

-- Verify the update
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  created_at,
  updated_at
FROM simple_users
WHERE email = 'samuel.k@taboola.com';

-- Also check if there are any duplicate entries
SELECT 
  COUNT(*) as user_count,
  email,
  array_agg(id) as user_ids,
  array_agg(role) as roles
FROM simple_users
WHERE email = 'samuel.k@taboola.com'
GROUP BY email; 