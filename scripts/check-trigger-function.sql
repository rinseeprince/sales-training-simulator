-- Check the problematic trigger function that's causing the FOR loop error
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'notify_assignment_completed';

-- Also check the notify_assignment_created function
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'notify_assignment_created';