-- Fix User Sync Issue - Version 2
-- Run this in your Supabase SQL Editor

-- First, make password_hash nullable since we're using Supabase Auth
ALTER TABLE simple_users ALTER COLUMN password_hash DROP NOT NULL;

-- Re-enable the trigger (it was disabled to fix signup issues)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Manually sync existing auth users to simple_users table
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
  'supabase_auth', -- Placeholder since we're using Supabase Auth
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.id NOT IN (
  SELECT COALESCE(auth_user_id, id) 
  FROM simple_users 
  WHERE auth_user_id IS NOT NULL OR id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  email_verified = EXCLUDED.email_verified,
  password_hash = 'supabase_auth',
  updated_at = EXCLUDED.updated_at;
