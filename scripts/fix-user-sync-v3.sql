-- Fix User Sync Issue - Version 3
-- Run this in your Supabase SQL Editor

-- First, make password_hash nullable since we're using Supabase Auth
ALTER TABLE simple_users ALTER COLUMN password_hash DROP NOT NULL;

-- Re-enable the trigger (it was disabled to fix signup issues)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Update existing simple_users records to link them with auth.users
UPDATE simple_users 
SET 
  auth_user_id = au.id,
  email_verified = au.email_confirmed_at IS NOT NULL,
  password_hash = COALESCE(password_hash, 'supabase_auth'),
  updated_at = au.updated_at
FROM auth.users au 
WHERE simple_users.email = au.email 
  AND simple_users.auth_user_id IS NULL;

-- Insert any auth.users that don't have corresponding simple_users records
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
  WHERE su.email = au.email OR su.id = au.id
);
