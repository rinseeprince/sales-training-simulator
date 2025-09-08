-- Remove Automatic Increment Trigger
-- Since we're now incrementing simulation count when simulation starts (not when saved),
-- we need to remove the automatic trigger that increments on call insert

-- Drop the trigger that auto-increments on call insert
DROP TRIGGER IF EXISTS increment_simulation_count_trigger ON calls;

-- Drop the function that was used by the trigger
DROP FUNCTION IF EXISTS auto_increment_simulation_on_call();

-- Verify the trigger is removed
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'increment_simulation_count_trigger';

-- The increment_simulation_count function is still needed for manual calls
-- So we keep it, but it won't be triggered automatically anymore 