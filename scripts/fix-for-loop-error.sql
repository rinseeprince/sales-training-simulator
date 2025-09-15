-- Fix FOR loop error on scenario_assignments table
-- This error typically occurs with problematic triggers or RLS policies

-- 1. First, let's see what triggers exist on scenario_assignments
SELECT 
  t.tgname as trigger_name,
  t.tgtype as trigger_type,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'scenario_assignments'
AND t.tgisinternal = false;

-- 2. Check if there are any RLS policies that might be causing issues
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'scenario_assignments';