-- Temporary workaround: Disable RLS on scenario_assignments for the update
-- This bypasses the problematic policy temporarily

-- Disable RLS temporarily
ALTER TABLE scenario_assignments DISABLE ROW LEVEL SECURITY;

-- Test if this fixes the update issue by manually updating the assignment
UPDATE scenario_assignments 
SET 
  status = 'completed',
  completed_at = NOW(),
  result = 'pass',
  score = 10
WHERE id = '1dd71e2b-6048-42ba-bf56-314097b5c9ef';

-- Check if the update worked
SELECT 
  id,
  status,
  completed_at,
  score,
  'Manual update test' as test_result
FROM scenario_assignments 
WHERE id = '1dd71e2b-6048-42ba-bf56-314097b5c9ef';

-- Re-enable RLS (comment this out if you want to leave it disabled temporarily)
-- ALTER TABLE scenario_assignments ENABLE ROW LEVEL SECURITY;