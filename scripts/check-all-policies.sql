-- Check ALL policies on scenario_assignments table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'scenario_assignments'
ORDER BY cmd, policyname;