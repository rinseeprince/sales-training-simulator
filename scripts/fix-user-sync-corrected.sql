-- Corrected User Sync Fix with Avatar Support
-- Run this in your Supabase SQL Editor to fix the current authentication problem

-- Step 1: Check and update the simple_users table structure
-- Add missing columns if they don't exist
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS simulations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_simulation_limit INTEGER DEFAULT 10;

-- Add password_hash column if it doesn't exist, make it nullable
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'simple_users' AND column_name = 'password_hash') THEN
        ALTER TABLE simple_users ADD COLUMN password_hash TEXT;
    END IF;
    
    -- Make password_hash nullable since we're using Supabase Auth
    ALTER TABLE simple_users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        -- Column might not exist or already nullable, continue
        NULL;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id ON simple_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_simple_users_stripe_customer ON simple_users(stripe_customer_id);

-- Step 2: Create/update the sync function
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert new user into simple_users
    INSERT INTO simple_users (
      id,
      auth_user_id,
      email,
      name,
      avatar_url,
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
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.email_confirmed_at IS NOT NULL,
      'free',
      'supabase_auth',
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      avatar_url = EXCLUDED.avatar_url,
      email_verified = EXCLUDED.email_verified,
      updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing user in simple_users
    UPDATE simple_users SET
      email = NEW.email,
      name = NEW.raw_user_meta_data->>'name',
      avatar_url = NEW.raw_user_meta_data->>'avatar_url',
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NEW.updated_at
    WHERE auth_user_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete user from simple_users
    DELETE FROM simple_users WHERE auth_user_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Enable the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

-- Step 4: Manually sync ALL existing auth users to simple_users table
INSERT INTO simple_users (
  id,
  auth_user_id,
  email,
  name,
  avatar_url,
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
  au.raw_user_meta_data->>'avatar_url',
  au.email_confirmed_at IS NOT NULL,
  'free',
  'supabase_auth',
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM simple_users su 
  WHERE su.auth_user_id = au.id OR su.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  email_verified = EXCLUDED.email_verified,
  subscription_status = EXCLUDED.subscription_status,
  password_hash = COALESCE(EXCLUDED.password_hash, 'supabase_auth'),
  updated_at = EXCLUDED.updated_at;

-- Step 5: Update RLS policies to allow the sync operations
DROP POLICY IF EXISTS "Users can insert their own profile" ON simple_users;
CREATE POLICY "Users can insert their own profile" ON simple_users
FOR INSERT WITH CHECK (
  auth.uid() = auth_user_id OR 
  auth.uid() = id OR 
  auth.uid() IS NULL  -- Allow system operations (triggers)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON simple_users;
CREATE POLICY "Users can update their own profile" ON simple_users
FOR UPDATE USING (
  auth.uid() = auth_user_id OR 
  auth.uid() = id OR 
  auth.uid() IS NULL  -- Allow system operations (triggers)
);

DROP POLICY IF EXISTS "Users can view their own profile" ON simple_users;
CREATE POLICY "Users can view their own profile" ON simple_users
FOR SELECT USING (
  auth.uid() = auth_user_id OR 
  auth.uid() = id
);

-- Step 6: Create user_usage table if it doesn't exist (for usage tracking)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_usage table
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_usage
DROP POLICY IF EXISTS "Users can view their own usage" ON user_usage;
CREATE POLICY "Users can view their own usage" ON user_usage
FOR SELECT USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own usage" ON user_usage;
CREATE POLICY "Users can insert their own usage" ON user_usage
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

-- Step 7: Verify the sync worked - check if users are now properly synced
SELECT 
  'Verification Results' as status,
  COUNT(au.id) as total_auth_users,
  COUNT(su.id) as total_simple_users,
  COUNT(CASE WHEN su.auth_user_id IS NOT NULL THEN 1 END) as properly_linked
FROM auth.users au
LEFT JOIN simple_users su ON su.auth_user_id = au.id OR su.id = au.id;

-- Step 8: Show specific user that was having issues
SELECT 
  'Current User Check' as status,
  au.id as auth_user_id,
  au.email as auth_email,
  au.email_confirmed_at as auth_verified,
  au.raw_user_meta_data->>'avatar_url' as auth_avatar,
  su.id as simple_user_id,
  su.email as simple_email,
  su.auth_user_id as simple_auth_user_id,
  su.email_verified as simple_verified,
  su.avatar_url as simple_avatar
FROM auth.users au
LEFT JOIN simple_users su ON su.auth_user_id = au.id
WHERE au.id = '8add881f-c0cf-45cc-9038-159d9b511390';

-- Step 9: Display success message
DO $$
BEGIN
  RAISE NOTICE 'User sync fix completed successfully!';
  RAISE NOTICE 'Avatar support has been added to the simple_users table.';
  RAISE NOTICE 'Database triggers are now active for automatic user sync.';
  RAISE NOTICE 'All existing auth users have been synced to simple_users.';
END $$; 