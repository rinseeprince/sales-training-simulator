-- Fix Signup Issue - Comprehensive Fix
-- Run this in your Supabase SQL Editor

-- First, let's disable the trigger temporarily to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Make sure password_hash is nullable
ALTER TABLE simple_users ALTER COLUMN password_hash DROP NOT NULL;

-- Make sure auth_user_id is properly set up
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id ON simple_users(auth_user_id);

-- Clean up any duplicate or problematic records
-- Remove any simple_users records that don't have a corresponding auth.users record
DELETE FROM simple_users 
WHERE auth_user_id IS NOT NULL 
AND auth_user_id NOT IN (SELECT id FROM auth.users);

-- Update any existing simple_users records to link them properly
UPDATE simple_users 
SET auth_user_id = au.id,
    email_verified = au.email_confirmed_at IS NOT NULL,
    password_hash = COALESCE(password_hash, 'supabase_auth')
FROM auth.users au 
WHERE simple_users.email = au.email 
AND simple_users.auth_user_id IS NULL;

-- Update the sync function to handle edge cases better
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only insert if the user doesn't already exist in simple_users
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
    ) VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      NEW.email_confirmed_at IS NOT NULL,
      'free',
      'supabase_auth',
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id = NEW.id,
      email = NEW.email,
      name = NEW.raw_user_meta_data->>'name',
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NEW.updated_at;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE simple_users SET
      email = NEW.email,
      name = NEW.raw_user_meta_data->>'name',
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NEW.updated_at
    WHERE auth_user_id = NEW.id OR id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM simple_users WHERE auth_user_id = OLD.id OR id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Update RLS policies to be more permissive for auth operations
DROP POLICY IF EXISTS "Users can insert their own profile" ON simple_users;
CREATE POLICY "Users can insert their own profile" ON simple_users
FOR INSERT WITH CHECK (
  auth.uid() = auth_user_id OR 
  auth.uid() = id OR 
  auth.uid() IS NULL  -- Allow system operations
);

-- Also allow updates during auth operations
DROP POLICY IF EXISTS "Users can update their own profile" ON simple_users;
CREATE POLICY "Users can update their own profile" ON simple_users
FOR UPDATE USING (
  auth.uid() = auth_user_id OR 
  auth.uid() = id OR 
  auth.uid() IS NULL  -- Allow system operations
);
