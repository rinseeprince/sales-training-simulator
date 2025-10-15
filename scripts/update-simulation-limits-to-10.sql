-- Update all users to 10 simulation limit (grandfather existing users over limit)
-- Run this in your Supabase SQL Editor

-- Update simulation_limit to 10 for all users, keeping current count if over 10
UPDATE simple_users 
SET simulation_limit = 10
WHERE simulation_limit IS NULL OR simulation_limit != 10;

-- Log the changes
SELECT 
  COUNT(*) as total_users_updated,
  COUNT(CASE WHEN simulation_count > 10 THEN 1 END) as users_grandfathered
FROM simple_users 
WHERE simulation_limit = 10;

-- Update the increment_simulation_count function to use 10 as default limit
CREATE OR REPLACE FUNCTION increment_simulation_count(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
  org_tier TEXT;
BEGIN
  -- Get current count, limit, subscription status, and org tier
  SELECT 
    u.simulation_count, 
    u.simulation_limit, 
    u.subscription_status,
    COALESCE(o.subscription_tier, 'free') as org_tier
  INTO current_count, current_limit, user_status, org_tier
  FROM simple_users u
  LEFT JOIN organizations o ON u.organization_id = o.id
  WHERE u.id = user_id OR u.auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'remaining', 0
    );
  END IF;

  -- Set limit to 10 for all users (including enterprise)
  current_limit := 10;

  -- Update the user's limit if it's not already 10
  IF current_limit != 10 THEN
    UPDATE simple_users 
    SET simulation_limit = 10
    WHERE id = user_id OR auth_user_id = user_id;
  END IF;

  -- Check if user has reached limit (don't grandfather during increment)
  IF current_count >= current_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Simulation limit reached (10 simulations per month). Please wait for monthly reset.',
      'count', current_count,
      'limit', current_limit,
      'remaining', 0
    );
  END IF;

  -- Increment count
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

-- Update the check_simulation_limit function to use 10 as limit for all users
CREATE OR REPLACE FUNCTION check_simulation_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  current_count INTEGER;
  current_limit INTEGER;
  user_status TEXT;
  org_tier TEXT;
BEGIN
  -- Get current count, limit, subscription status, and org tier
  SELECT 
    u.simulation_count, 
    u.simulation_limit, 
    u.subscription_status,
    COALESCE(o.subscription_tier, 'free') as org_tier
  INTO current_count, current_limit, user_status, org_tier
  FROM simple_users u
  LEFT JOIN organizations o ON u.organization_id = o.id
  WHERE u.id = user_id OR u.auth_user_id = user_id;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_simulate', false,
      'error', 'User not found',
      'remaining', 0
    );
  END IF;

  -- Set limit to 10 for all users (including enterprise)
  current_limit := 10;

  -- Update the user's limit if it's not already 10
  IF current_limit != 10 THEN
    UPDATE simple_users 
    SET simulation_limit = 10
    WHERE id = user_id OR auth_user_id = user_id;
  END IF;

  -- Check if user can simulate (grandfather users over limit)
  IF current_count >= current_limit THEN
    RETURN jsonb_build_object(
      'can_simulate', false,
      'count', current_count,
      'limit', current_limit,
      'remaining', 0,
      'message', 'You have reached your simulation limit (10 per month). Limit resets monthly.'
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

-- Create function to make coaching sessions count towards simulation limit
CREATE OR REPLACE FUNCTION increment_simulation_count_for_coaching()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment simulation count when a coaching session is saved
  PERFORM increment_simulation_count(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to coaching_sessions table to count towards simulation limit
DROP TRIGGER IF EXISTS coaching_session_simulation_count_trigger ON coaching_sessions;
CREATE TRIGGER coaching_session_simulation_count_trigger
AFTER INSERT ON coaching_sessions
FOR EACH ROW
EXECUTE FUNCTION increment_simulation_count_for_coaching();

-- Log final state
SELECT 
  'Database updated successfully!' as message,
  COUNT(*) as total_users,
  AVG(simulation_limit) as avg_limit,
  COUNT(CASE WHEN simulation_count > simulation_limit THEN 1 END) as grandfathered_users
FROM simple_users;