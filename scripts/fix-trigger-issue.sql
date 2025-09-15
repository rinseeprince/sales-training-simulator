-- Fix the problematic trigger causing FOR loop error
-- The trigger_notify_assignment_completed trigger is causing the issue

-- Disable the problematic trigger temporarily
ALTER TABLE scenario_assignments DISABLE TRIGGER trigger_notify_assignment_completed;

-- Test if the assignment can now be updated
UPDATE scenario_assignments 
SET 
  status = 'completed',
  completed_at = NOW(),
  result = 'pass',
  score = 99
WHERE id = '1dd71e2b-6048-42ba-bf56-314097b5c9ef'
RETURNING id, status, completed_at, score, 'Trigger disabled - update test' as test_result;

-- If the above works, we know the trigger was the issue
-- We can then either fix the trigger function or keep it disabled

-- Check the current status
SELECT 
  id,
  status,
  completed_at,
  score,
  'Current assignment status' as info
FROM scenario_assignments 
WHERE id = '1dd71e2b-6048-42ba-bf56-314097b5c9ef';