-- Add simulation usage tracking for free tier limits
-- Run this in your Supabase SQL Editor

-- Add simulation_count column to simple_users table if it doesn't exist
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS simulation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS simulation_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_simulation_at TIMESTAMP WITH TIME ZONE;

-- Create a function to increment simulation count
CREATE OR REPLACE FUNCTION increment_simulation_count(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
BEGIN
  -- Get current count, limit, and subscription status
  SELECT simulation_count, simulation_limit, subscription_status 
  INTO current_count, current_limit, user_status
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'remaining', 0
    );
  END IF;

  -- Skip limit check for paid users
  IF user_status = 'paid' OR user_status = 'trial' THEN
    -- Still increment count for tracking
    UPDATE simple_users 
    SET 
      simulation_count = simulation_count + 1,
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
    simulation_count = simulation_count + 1,
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

-- Create a function to check remaining simulations
CREATE OR REPLACE FUNCTION check_simulation_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
BEGIN
  -- Get current count, limit, and subscription status
  SELECT simulation_count, simulation_limit, subscription_status 
  INTO current_count, current_limit, user_status
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_simulate', false,
      'error', 'User not found',
      'remaining', 0
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

-- Create a function to reset simulation count (for admin use or monthly resets)
CREATE OR REPLACE FUNCTION reset_simulation_count(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE simple_users 
  SET simulation_count = 0
  WHERE id = user_id OR auth_user_id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to automatically increment simulation count when a new call is created
CREATE OR REPLACE FUNCTION auto_increment_simulation_on_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the simulation count for the user
  PERFORM increment_simulation_count(NEW.rep_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS increment_simulation_count_trigger ON calls;
CREATE TRIGGER increment_simulation_count_trigger
AFTER INSERT ON calls
FOR EACH ROW
EXECUTE FUNCTION auto_increment_simulation_on_call(); 