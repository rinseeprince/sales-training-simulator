-- Quick Fix for New User with No Simulations
-- Run this in Supabase SQL Editor

-- Step 1: Find your new user and check their current values
SELECT 
  id,
  auth_user_id,
  email,
  simulation_count,
  simulation_limit,
  subscription_status,
  created_at
FROM simple_users
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Step 2: Fix ALL users that have NULL or missing simulation values
UPDATE simple_users
SET 
  simulation_count = 0,
  simulation_limit = 50,
  subscription_status = 'free'
WHERE (simulation_count IS NULL 
  OR simulation_limit IS NULL
  OR subscription_status IS NULL
  OR simulation_limit = 0)
  AND (subscription_status IS NULL OR subscription_status = 'free');

-- Step 3: Verify the fix worked
SELECT 
  id,
  email,
  simulation_count,
  simulation_limit,
  subscription_status
FROM simple_users
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Step 4: If you know the specific email, you can also run this
-- (replace with your actual email)
/*
UPDATE simple_users
SET 
  simulation_count = 0,
  simulation_limit = 50,
  subscription_status = 'free'
WHERE email = 'your-new-account@company.com';
*/ 