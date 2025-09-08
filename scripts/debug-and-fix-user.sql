-- Debug and Fix User Simulation Limits
-- Run each section in order in your Supabase SQL Editor

-- SECTION 1: Check if the functions exist
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'check_simulation_limit';

-- SECTION 2: Find ALL your users and their current simulation values
SELECT 
  id,
  auth_user_id,
  email,
  simulation_count,
  simulation_limit,
  subscription_status,
  created_at
FROM simple_users
ORDER BY created_at DESC;

-- SECTION 3: Check auth.users table to see all registered users
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- SECTION 4: Fix ANY user with NULL or 0 limit
UPDATE simple_users
SET 
  simulation_count = COALESCE(simulation_count, 0),
  simulation_limit = CASE 
    WHEN simulation_limit IS NULL OR simulation_limit = 0 THEN 50
    ELSE simulation_limit
  END,
  subscription_status = COALESCE(subscription_status, 'free')
WHERE simulation_limit IS NULL 
  OR simulation_limit = 0
  OR subscription_status IS NULL;

-- SECTION 5: Create a simple function that ALWAYS works
CREATE OR REPLACE FUNCTION check_simulation_limit(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Try to find the user
  SELECT 
    COALESCE(simulation_count, 0) as count,
    COALESCE(simulation_limit, 50) as limit,
    COALESCE(subscription_status, 'free') as status
  INTO user_record
  FROM simple_users 
  WHERE id = user_id OR auth_user_id = user_id
  LIMIT 1;

  -- If no user found, return defaults for new user
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_simulate', true,
      'count', 0,
      'limit', 50,
      'remaining', 50,
      'is_paid', false,
      'canSimulate', true  -- Add both formats for compatibility
    );
  END IF;

  -- Check if paid user
  IF user_record.status IN ('paid', 'trial', 'premium') THEN
    RETURN jsonb_build_object(
      'can_simulate', true,
      'canSimulate', true,
      'count', user_record.count,
      'limit', user_record.limit,
      'remaining', -1,
      'is_paid', true
    );
  END IF;

  -- Free user logic
  RETURN jsonb_build_object(
    'can_simulate', user_record.count < user_record.limit,
    'canSimulate', user_record.count < user_record.limit,
    'count', user_record.count,
    'limit', user_record.limit,
    'remaining', GREATEST(0, user_record.limit - user_record.count),
    'is_paid', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 6: Test the function with a sample user
-- Get the first user's ID and test
DO $$
DECLARE
  test_user_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO test_user_id FROM simple_users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    SELECT check_simulation_limit(test_user_id) INTO result;
    RAISE NOTICE 'Test result for user %: %', test_user_id, result;
  END IF;
END $$;

-- SECTION 7: Final check - all users should now have proper values
SELECT 
  email,
  simulation_count,
  simulation_limit,
  subscription_status,
  CASE 
    WHEN simulation_limit > 0 THEN 'OK'
    ELSE 'NEEDS FIX'
  END as status_check
FROM simple_users
ORDER BY created_at DESC; 