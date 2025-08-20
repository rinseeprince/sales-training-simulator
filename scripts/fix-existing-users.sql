-- Fix existing users that don't have proper auth_user_id links
-- Run this in your Supabase SQL Editor

-- First, let's see what we're working with
SELECT 
  su.id,
  su.email,
  su.auth_user_id,
  au.id as auth_users_id,
  au.email as auth_users_email
FROM simple_users su
LEFT JOIN auth.users au ON su.email = au.email
WHERE su.auth_user_id IS NULL OR su.auth_user_id != au.id;

-- Update simple_users to link with auth.users by email
UPDATE simple_users su
SET 
  auth_user_id = au.id,
  email_verified = au.email_confirmed_at IS NOT NULL,
  updated_at = au.updated_at
FROM auth.users au
WHERE su.email = au.email
  AND (su.auth_user_id IS NULL OR su.auth_user_id != au.id);

-- Verify the fix
SELECT 
  su.id,
  su.email,
  su.auth_user_id,
  au.id as auth_users_id,
  au.email as auth_users_email
FROM simple_users su
LEFT JOIN auth.users au ON su.auth_user_id = au.id
WHERE su.auth_user_id IS NOT NULL;
