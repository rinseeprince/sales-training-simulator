-- Quick fix for existing users - run this in Supabase SQL Editor

-- Update existing simple_users records to link with auth.users by email
UPDATE simple_users su
SET 
  auth_user_id = au.id,
  email_verified = au.email_confirmed_at IS NOT NULL,
  updated_at = au.updated_at
FROM auth.users au
WHERE su.email = au.email
  AND su.auth_user_id IS NULL;

-- Verify the fix worked
SELECT 
  su.id,
  su.email,
  su.auth_user_id,
  su.email_verified,
  au.email_confirmed_at IS NOT NULL as auth_email_confirmed
FROM simple_users su
LEFT JOIN auth.users au ON su.auth_user_id = au.id
ORDER BY su.created_at DESC;
