-- Fix simulation limits for new users
-- Run this in your Supabase SQL Editor

-- First, ensure all existing users have proper default values
UPDATE simple_users 
SET 
  simulation_count = COALESCE(simulation_count, 0),
  simulation_limit = COALESCE(simulation_limit, 50)
WHERE simulation_count IS NULL OR simulation_limit IS NULL;

-- Drop and recreate the check_simulation_limit function with better handling
CREATE OR REPLACE FUNCTION check_simulation_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
BEGIN
  -- Get current count, limit, and subscription status
  -- Use COALESCE to handle NULL values for new users
  SELECT 
    COALESCE(simulation_count, 0),
    COALESCE(simulation_limit, 50),
    COALESCE(subscription_status, 'free')
  INTO current_count, current_limit, user_status
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    -- For new users who might not be in the table yet, return default free tier
    RETURN jsonb_build_object(
      'can_simulate', true,
      'count', 0,
      'limit', 50,
      'remaining', 50,
      'is_paid', false,
      'message', 'New user - 50 simulations available'
    );
  END IF;

  -- Paid users have unlimited simulations
  IF user_status = 'paid' OR user_status = 'trial' THEN
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
      'message', 'You have reached your free simulation limit. Please upgrade to continue.'
    );
  END IF;

  RETURN jsonb_build_object(
    'can_simulate', true,
    'count', current_count,
    'limit', current_limit,
    'remaining', current_limit - current_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the increment function to handle new users better
CREATE OR REPLACE FUNCTION increment_simulation_count(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
BEGIN
  -- Get current count, limit, and subscription status with defaults
  SELECT 
    COALESCE(simulation_count, 0),
    COALESCE(simulation_limit, 50),
    COALESCE(subscription_status, 'free')
  INTO current_count, current_limit, user_status
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    -- For new users, we should still allow them to use the service
    -- They might not be fully synced yet
    RETURN jsonb_build_object(
      'success', true,
      'count', 1,
      'limit', 50,
      'remaining', 49,
      'message', 'New user - first simulation'
    );
  END IF;

  -- Skip limit check for paid users
  IF user_status = 'paid' OR user_status = 'trial' THEN
    -- Still increment count for tracking
    UPDATE simple_users 
    SET 
      simulation_count = COALESCE(simulation_count, 0) + 1,
      last_simulation_at = NOW()
    WHERE id = user_id OR auth_user_id = user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'count', current_count + 1,
      'limit', current_limit,
      'remaining', -1,  -- Unlimited for paid users
      'is_paid', true
    );
  END IF;

  -- Check if free user has reached limit
  IF current_count >= current_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation limit reached. Please upgrade to continue.',
      'count', current_count,
      'limit', current_limit,
      'remaining', 0
    );
  END IF;

  -- Increment count for free user
  UPDATE simple_users 
  SET 
    simulation_count = COALESCE(simulation_count, 0) + 1,
    last_simulation_at = NOW()
  WHERE id = user_id OR auth_user_id = user_id;

  RETURN jsonb_build_object(
    'success', true,
    'count', current_count + 1,
    'limit', current_limit,
    'remaining', current_limit - (current_count + 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to initialize new users with default values
CREATE OR REPLACE FUNCTION initialize_user_simulation_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default values for new users
  NEW.simulation_count := COALESCE(NEW.simulation_count, 0);
  NEW.simulation_limit := COALESCE(NEW.simulation_limit, 50);
  NEW.subscription_status := COALESCE(NEW.subscription_status, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set defaults for new users
DROP TRIGGER IF EXISTS set_user_simulation_defaults ON simple_users;
CREATE TRIGGER set_user_simulation_defaults
BEFORE INSERT ON simple_users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_simulation_limits();

-- Fix any existing users that might have NULL values
UPDATE simple_users
SET 
  simulation_count = 0,
  simulation_limit = 50
WHERE simulation_count IS NULL 
  OR simulation_limit IS NULL;

-- Verify the fix by checking for any users with NULL values
SELECT 
  id,
  email,
  simulation_count,
  simulation_limit,
  subscription_status
FROM simple_users
WHERE simulation_count IS NULL 
  OR simulation_limit IS NULL
  OR subscription_status IS NULL; 