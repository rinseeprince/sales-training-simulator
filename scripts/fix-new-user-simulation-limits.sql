-- Fix for New User Simulation Limits
-- This ensures new users get proper simulation limits when they sign up
-- Run this in your Supabase SQL Editor

-- Step 1: Update the sync function to include simulation fields
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert new user into simple_users with proper simulation defaults
    INSERT INTO simple_users (
      id,
      auth_user_id,
      email,
      name,
      email_verified,
      subscription_status,
      password_hash,
      simulation_count,      -- Add this
      simulation_limit,      -- Add this
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
      0,                     -- Start with 0 simulations used
      50,                    -- Give 50 simulations for free tier
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      auth_user_id = EXCLUDED.auth_user_id,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      email_verified = EXCLUDED.email_verified,
      simulation_count = COALESCE(simple_users.simulation_count, 0),  -- Keep existing count
      simulation_limit = COALESCE(simple_users.simulation_limit, 50), -- Keep existing limit
      updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing user in simple_users
    UPDATE simple_users SET
      email = NEW.email,
      name = COALESCE(NEW.raw_user_meta_data->>'name', simple_users.name),
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NEW.updated_at
    WHERE auth_user_id = NEW.id OR id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Fix any existing users that have NULL simulation values
UPDATE simple_users
SET 
  simulation_count = COALESCE(simulation_count, 0),
  simulation_limit = COALESCE(simulation_limit, 50),
  subscription_status = COALESCE(subscription_status, 'free')
WHERE simulation_count IS NULL 
  OR simulation_limit IS NULL
  OR subscription_status IS NULL;

-- Step 3: For your specific new user that's having issues
-- Find and fix them by email (replace with actual email)
-- UPDATE simple_users
-- SET 
--   simulation_count = 0,
--   simulation_limit = 50,
--   subscription_status = 'free'
-- WHERE email = 'your-new-user@company.com';

-- Step 4: Verify all users now have proper values
SELECT 
  id,
  email,
  simulation_count,
  simulation_limit,
  subscription_status,
  created_at
FROM simple_users
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Create a more robust check_simulation_limit function
CREATE OR REPLACE FUNCTION check_simulation_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists in simple_users
  SELECT EXISTS(
    SELECT 1 FROM simple_users 
    WHERE id = user_id OR auth_user_id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    -- New user not yet synced - allow them to start with default limits
    RETURN jsonb_build_object(
      'can_simulate', true,
      'count', 0,
      'limit', 50,
      'remaining', 50,
      'is_paid', false,
      'message', 'Welcome! You have 50 free simulations to get started.'
    );
  END IF;

  -- Get current count, limit, and subscription status with defaults
  SELECT 
    COALESCE(simulation_count, 0),
    COALESCE(simulation_limit, 50),
    COALESCE(subscription_status, 'free')
  INTO current_count, current_limit, user_status
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id;

  -- Paid users have unlimited simulations
  IF user_status IN ('paid', 'trial', 'premium', 'enterprise') THEN
    RETURN jsonb_build_object(
      'can_simulate', true,
      'count', current_count,
      'limit', current_limit,
      'remaining', -1,  -- Unlimited
      'is_paid', true
    );
  END IF;

  -- Check free user limit
  IF current_count >= current_limit THEN
    RETURN jsonb_build_object(
      'can_simulate', false,
      'count', current_count,
      'limit', current_limit,
      'remaining', 0,
      'message', 'You have reached your free simulation limit. Please upgrade to continue.',
      'is_paid', false
    );
  END IF;

  -- Free user with simulations remaining
  RETURN jsonb_build_object(
    'can_simulate', true,
    'count', current_count,
    'limit', current_limit,
    'remaining', current_limit - current_count,
    'is_paid', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Test the function with a sample user ID
-- Replace with an actual user ID from your database
-- SELECT check_simulation_limit('your-user-id-here'); 