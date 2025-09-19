-- Fix Assignment Completion Trigger
-- This script updates the trigger to ensure managers get notified even for self-assignments
-- Run this in your Supabase SQL Editor

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_assignment_completed ON assignment_completions;

-- Update the trigger function to handle self-assignments
CREATE OR REPLACE FUNCTION notify_assignment_completed()
RETURNS TRIGGER AS $$
DECLARE
  assignment_record scenario_assignments%ROWTYPE;
  user_name TEXT;
  scenario_title TEXT;
BEGIN
  -- Get assignment details
  SELECT * INTO assignment_record
  FROM scenario_assignments
  WHERE id = NEW.assignment_id;
  
  -- Get completer's name
  SELECT name INTO user_name
  FROM simple_users
  WHERE id = NEW.completed_by;
  
  -- Get scenario title
  SELECT title INTO scenario_title
  FROM scenarios
  WHERE id = assignment_record.scenario_id;
  
  -- Notify the manager who assigned it (even if self-assigned)
  IF assignment_record.assigned_by IS NOT NULL THEN
    -- Check if this is a self-assignment
    IF assignment_record.assigned_by = assignment_record.assigned_to_user THEN
      -- Self-assignment completed - still notify for tracking
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (
        assignment_record.assigned_by,
        'assignment_completed',
        'Self-Assignment Completed',
        'You completed: ' || COALESCE(scenario_title, 'Training Assignment'),
        'call',
        NEW.call_id
      );
    ELSE
      -- Regular assignment - notify the manager
      INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
      VALUES (
        assignment_record.assigned_by,
        'assignment_completed',
        'Assignment Completed',
        COALESCE(user_name, 'A user') || ' completed: ' || COALESCE(scenario_title, 'Training Assignment'),
        'call',
        NEW.call_id
      );
    END IF;
  END IF;
  
  -- Update assignment status to completed
  UPDATE scenario_assignments
  SET status = 'completed',
      call_id = NEW.call_id,
      updated_at = NOW()
  WHERE id = NEW.assignment_id;
  
  -- Log for debugging
  RAISE NOTICE 'Assignment completion processed: assignment_id=%, call_id=%, completed_by=%', 
    NEW.assignment_id, NEW.call_id, NEW.completed_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_assignment_completed
AFTER INSERT ON assignment_completions
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_completed();

-- Verify the trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_assignment_completed';

-- Test query to check if assignment_completions exist
SELECT 
  ac.id,
  ac.assignment_id,
  ac.call_id,
  ac.completed_by,
  ac.completed_at,
  sa.status as assignment_status,
  s.title as scenario_title
FROM assignment_completions ac
LEFT JOIN scenario_assignments sa ON sa.id = ac.assignment_id
LEFT JOIN scenarios s ON s.id = sa.scenario_id
ORDER BY ac.completed_at DESC
LIMIT 5; 