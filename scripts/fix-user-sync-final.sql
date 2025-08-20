-- Final fix for user sync issues
-- Run this in your Supabase SQL Editor

-- Step 1: Ensure the simple_users table has the right structure
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Make password_hash nullable if it's not already
ALTER TABLE simple_users ALTER COLUMN password_hash DROP NOT NULL;

-- Step 3: Add index for auth_user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id ON simple_users(auth_user_id);

-- Step 4: Manually sync existing auth.users to simple_users
INSERT INTO simple_users (
  id,
  auth_user_id,
  email,
  name,
  email_verified,
  subscription_status,
  password_hash,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.id,
  au.email,
  au.raw_user_meta_data->>'name',
  au.email_confirmed_at IS NOT NULL,
  'free',
  'supabase_auth',
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM simple_users su 
  WHERE su.auth_user_id = au.id OR su.email = au.email
)
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  email_verified = EXCLUDED.email_verified,
  subscription_status = EXCLUDED.subscription_status,
  updated_at = EXCLUDED.updated_at;

-- Step 5: Update existing simple_users records to link with auth.users
UPDATE simple_users su
SET 
  auth_user_id = au.id,
  email_verified = au.email_confirmed_at IS NOT NULL,
  updated_at = au.updated_at
FROM auth.users au
WHERE su.email = au.email
  AND su.auth_user_id IS NULL;

-- Step 6: Verify the sync worked
SELECT 
  su.id,
  su.email,
  su.auth_user_id,
  su.email_verified,
  au.email_confirmed_at IS NOT NULL as auth_email_confirmed
FROM simple_users su
LEFT JOIN auth.users au ON su.auth_user_id = au.id
ORDER BY su.created_at DESC;
