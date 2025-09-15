-- Final fix for the remaining problematic RLS policy
-- The "Users can view their own assignments" policy is causing the FOR loop error

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own assignments" ON scenario_assignments;

-- Recreate with proper NULL handling and no subquery arrays
CREATE POLICY "Users can view their own assignments" ON scenario_assignments
  FOR SELECT USING (
    -- User can see assignments assigned directly to them
    assigned_to_user = (
      SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
    )
    OR
    -- User can see assignments assigned to their team (only if they have a team)
    (assigned_to_team IS NOT NULL AND assigned_to_team = (
      SELECT team_id FROM simple_users WHERE auth_user_id = auth.uid() AND team_id IS NOT NULL
    ))
  );

-- Verify all policies are now safe
SELECT 
  policyname,
  cmd,
  'Policy updated and safe' as status
FROM pg_policies 
WHERE tablename = 'scenario_assignments'
ORDER BY cmd, policyname;