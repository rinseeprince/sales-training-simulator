-- Check for triggers on scenario_assignments table that might be causing FOR loop error
SELECT 
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'scenario_assignments'
AND n.nspname = 'public'
AND t.tgisinternal = false;