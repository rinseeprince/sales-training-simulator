-- Fix the problematic RLS policy causing FOR loop error
-- The issue is with NULL role values in the ANY array check

-- Drop the problematic UPDATE policy
DROP POLICY IF EXISTS "Managers can update assignments" ON scenario_assignments;

-- Recreate the policy with proper NULL handling
CREATE POLICY "Managers can update assignments" ON scenario_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM simple_users
      WHERE simple_users.auth_user_id = auth.uid()
      AND (
        simple_users.role = 'manager' OR 
        simple_users.role = 'admin'
      )
    )
  );

-- Also check if there are similar issues with other policies
-- Drop and recreate other policies that might have the same issue

-- Fix the SELECT policy for managers if it has the same issue
DROP POLICY IF EXISTS "Managers can view all assignments" ON scenario_assignments;
CREATE POLICY "Managers can view all assignments" ON scenario_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM simple_users
      WHERE simple_users.auth_user_id = auth.uid()
      AND (
        simple_users.role = 'manager' OR 
        simple_users.role = 'admin'
      )
    )
  );

-- Fix the INSERT policy for managers if it has the same issue  
DROP POLICY IF EXISTS "Managers can create assignments" ON scenario_assignments;
CREATE POLICY "Managers can create assignments" ON scenario_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM simple_users
      WHERE simple_users.auth_user_id = auth.uid()
      AND (
        simple_users.role = 'manager' OR 
        simple_users.role = 'admin'
      )
    )
  );

-- Verify the policies were updated
SELECT 
  policyname,
  cmd,
  'Policy updated successfully' as status
FROM pg_policies 
WHERE tablename = 'scenario_assignments'
AND cmd IN ('UPDATE', 'INSERT', 'SELECT')
ORDER BY cmd, policyname;