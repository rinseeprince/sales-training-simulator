-- Temporarily disable RLS to test if that fixes the assignment update
-- This is a diagnostic test to confirm RLS is the issue

-- Check current RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  'Current RLS status' as status
FROM pg_tables 
WHERE tablename = 'scenario_assignments';

-- Temporarily disable RLS for testing
ALTER TABLE scenario_assignments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  'RLS disabled for testing' as status
FROM pg_tables 
WHERE tablename = 'scenario_assignments';

-- Now try to manually update the assignment to see if it works
UPDATE scenario_assignments 
SET 
  status = 'completed',
  completed_at = NOW(),
  result = 'test',
  score = 99
WHERE id = '1dd71e2b-6048-42ba-bf56-314097b5c9ef'
RETURNING id, status, completed_at, score;