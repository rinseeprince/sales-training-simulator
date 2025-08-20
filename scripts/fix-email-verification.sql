-- Fix email verification status for existing users
-- Run this in your Supabase SQL Editor

-- Update email_verified to match auth.users email_confirmed_at status
UPDATE simple_users su
SET 
  email_verified = au.email_confirmed_at IS NOT NULL,
  updated_at = au.updated_at
FROM auth.users au
WHERE su.auth_user_id = au.id;

-- Verify the fix
SELECT 
  su.email,
  su.email_verified as simple_users_verified,
  au.email_confirmed_at IS NOT NULL as auth_users_verified
FROM simple_users su
LEFT JOIN auth.users au ON su.auth_user_id = au.id
ORDER BY su.created_at DESC;
