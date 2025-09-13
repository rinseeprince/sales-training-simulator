-- Make samuel.k@taboola.com an admin user
-- Run this in your Supabase SQL Editor

-- Step 1: Check if the user exists
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  created_at
FROM simple_users 
WHERE email = 'samuel.k@taboola.com';

-- Step 2: Update the user to admin role and paid status
UPDATE simple_users 
SET 
  role = 'admin',
  subscription_status = 'paid',
  simulation_limit = 999999,  -- Unlimited simulations
  updated_at = NOW()
WHERE email = 'samuel.k@taboola.com';

-- Step 3: Verify the update
SELECT 
  id,
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  simulation_count,
  simulation_limit,
  updated_at
FROM simple_users 
WHERE email = 'samuel.k@taboola.com';

-- Step 4: If user doesn't exist in simple_users but exists in auth.users, sync them
-- First check auth.users table
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'samuel.k@taboola.com';

-- Step 5: If user exists in auth.users but not simple_users, create the record
INSERT INTO simple_users (
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  simulation_count,
  simulation_limit,
  email_verified,
  created_at,
  updated_at
) 
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Samuel Kalepa'),
  'admin',
  'paid',
  0,
  999999,
  au.email_confirmed_at IS NOT NULL,
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'samuel.k@taboola.com'
  AND NOT EXISTS (
    SELECT 1 FROM simple_users su 
    WHERE su.email = au.email OR su.auth_user_id = au.id
  );

-- Step 6: Final verification - show the admin user
SELECT 
  'Admin user created/updated:' as status,
  id,
  auth_user_id,
  email,
  name,
  role,
  subscription_status,
  simulation_count,
  simulation_limit,
  email_verified,
  created_at,
  updated_at
FROM simple_users 
WHERE email = 'samuel.k@taboola.com'; 