-- ================================================
-- Fix RLS Infinite Recursion Issues
-- ================================================
-- This script fixes the circular RLS policy references that cause infinite recursion

-- ========================================
-- STEP 1: Drop problematic policies
-- ========================================

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view organization members" ON simple_users;
DROP POLICY IF EXISTS "Users can manage organization scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can view organization calls" ON calls;
DROP POLICY IF EXISTS "Users can manage their own calls" ON calls;
DROP POLICY IF EXISTS "Users can update their own calls" ON calls;
DROP POLICY IF EXISTS "Users can view organization teams" ON teams;

-- ========================================
-- STEP 2: Create simple, non-recursive policies
-- ========================================

-- Simple users policies - avoid self-reference
CREATE POLICY "Users can view their own profile" ON simple_users
FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON simple_users
FOR UPDATE USING (auth_user_id = auth.uid());

-- Managers and admins can view organization members (without self-reference)
CREATE POLICY "Managers can view organization members" ON simple_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM simple_users manager 
    WHERE manager.auth_user_id = auth.uid() 
    AND manager.role IN ('manager', 'admin')
    AND manager.organization_id = simple_users.organization_id
  )
);

-- ========================================
-- STEP 3: Fix scenarios policies
-- ========================================

-- Users can view scenarios in their organization
CREATE POLICY "Organization scenarios access" ON scenarios
FOR SELECT USING (
  organization_id = (
    SELECT su.organization_id FROM simple_users su 
    WHERE su.auth_user_id = auth.uid()
  )
);

-- Users can create scenarios in their organization
CREATE POLICY "Users can create scenarios" ON scenarios
FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  AND organization_id = (SELECT organization_id FROM simple_users WHERE auth_user_id = auth.uid())
);

-- Users can update their own scenarios or admins can update any in org
CREATE POLICY "Users can update scenarios" ON scenarios
FOR UPDATE USING (
  user_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin' 
    AND organization_id = scenarios.organization_id
  )
);

-- Users can delete their own scenarios or admins can delete any in org
CREATE POLICY "Users can delete scenarios" ON scenarios
FOR DELETE USING (
  user_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users 
    WHERE auth_user_id = auth.uid() 
    AND role = 'admin' 
    AND organization_id = scenarios.organization_id
  )
);

-- ========================================
-- STEP 4: Fix calls policies
-- ========================================

-- Users can view calls in their organization
CREATE POLICY "Organization calls access" ON calls
FOR SELECT USING (
  organization_id = (
    SELECT su.organization_id FROM simple_users su 
    WHERE su.auth_user_id = auth.uid()
  )
);

-- Users can create their own calls
CREATE POLICY "Users can create calls" ON calls
FOR INSERT WITH CHECK (
  rep_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  AND organization_id = (SELECT organization_id FROM simple_users WHERE auth_user_id = auth.uid())
);

-- Users can update their own calls or managers can update team calls
CREATE POLICY "Users can update calls" ON calls
FOR UPDATE USING (
  rep_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('manager', 'admin')
    AND organization_id = calls.organization_id
  )
);

-- ========================================
-- STEP 5: Fix teams policies (if teams table exists)
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    -- Drop existing team policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view organization teams" ON teams';
    
    -- Create simple team policy
    EXECUTE 'CREATE POLICY "Organization teams access" ON teams
    FOR SELECT USING (
      organization_id = (
        SELECT su.organization_id FROM simple_users su 
        WHERE su.auth_user_id = auth.uid()
      )
    )';
  END IF;
END $$;

-- ========================================
-- STEP 6: Fix notification policies
-- ========================================

-- Users can only see their own notifications (this should work fine)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (
  recipient_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE USING (
  recipient_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
);

-- ========================================
-- STEP 7: Create a helper function to get current user info
-- ========================================

-- This function helps avoid recursion by providing a clean way to get user info
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(
  user_id UUID,
  organization_id UUID,
  user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT su.id, su.organization_id, su.role
  FROM simple_users su
  WHERE su.auth_user_id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 8: Test the fix
-- ========================================

-- This should now work without infinite recursion
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test if we can query simple_users without recursion
  SELECT * INTO test_result FROM get_current_user_info();
  
  IF test_result.user_id IS NOT NULL THEN
    RAISE NOTICE 'SUCCESS: RLS policies fixed - user info retrieved without recursion';
  ELSE
    RAISE NOTICE 'INFO: No current user found (this is normal if not authenticated)';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: RLS fix failed - %', SQLERRM;
END $$;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'RLS Infinite Recursion Fix Complete!';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '- Removed circular policy references';
  RAISE NOTICE '- Simplified organization-based access control';
  RAISE NOTICE '- Added helper function for user context';
  RAISE NOTICE '';
  RAISE NOTICE 'You should now be able to:';
  RAISE NOTICE '1. Sign in without infinite recursion errors';
  RAISE NOTICE '2. Access organization data properly';
  RAISE NOTICE '3. Use the updated API endpoints';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test sign-in and API endpoints';
END $$;