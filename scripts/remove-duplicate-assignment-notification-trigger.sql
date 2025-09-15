-- Fix: Remove duplicate assignment completion notifications
-- 
-- PROBLEM: 
-- When a user completes an assignment, managers receive 2 notifications:
-- 1. From API (save-call/route.ts) - includes score, goes to post-call review ✅ KEEP
-- 2. From DB trigger - basic message, goes to saved scenarios ❌ REMOVE
--
-- SOLUTION:
-- Remove the database trigger since the API already handles notifications with better details

-- Drop the trigger that creates duplicate notifications
DROP TRIGGER IF EXISTS trigger_notify_assignment_completed ON scenario_assignments;

-- Keep the function but disable it from being called
-- We might want to re-enable it later if needed
-- DROP FUNCTION IF EXISTS notify_assignment_completed();

-- Verify the trigger was removed
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'SUCCESS: Duplicate notification trigger removed'
    ELSE 'WARNING: Trigger still exists'
  END AS status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_assignment_completed';

-- Show remaining triggers on scenario_assignments table for reference
SELECT 
  trigger_name, 
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'scenario_assignments'
ORDER BY trigger_name;