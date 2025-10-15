-- Disable automatic coaching session simulation count trigger
-- We now handle this manually in the API to support dual organization/individual tracking

-- Drop the trigger that automatically increments simulation count for coaching sessions
DROP TRIGGER IF EXISTS coaching_session_simulation_count_trigger ON coaching_sessions;

-- Note: Keep the function in case we need it later
-- DROP FUNCTION IF EXISTS increment_simulation_count_for_coaching();

-- Verify trigger is removed
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'coaching_session_simulation_count_trigger';