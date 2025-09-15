-- Fix the problematic trigger functions causing FOR loop errors
-- The issue is array_length() returning NULL when arrays are empty

-- First, let's check if notify_assignment_completed function exists
-- If it doesn't exist, we'll create a safe one
-- If it does exist, we'll replace it with a safe version

-- Replace the problematic notify_assignment_created function
CREATE OR REPLACE FUNCTION notify_assignment_created()
RETURNS TRIGGER AS $$
DECLARE
  scenario_title TEXT;
  assigner_name TEXT;
  assignee_ids UUID[];
  assignee_id UUID;
BEGIN
  -- Get scenario title
  SELECT title INTO scenario_title FROM scenarios WHERE id = NEW.scenario_id;
  
  -- Get assigner name
  SELECT name INTO assigner_name FROM simple_users WHERE id = NEW.assigned_by;
  
  -- Get assignee IDs
  IF NEW.assigned_to_user IS NOT NULL THEN
    assignee_ids := ARRAY[NEW.assigned_to_user];
  ELSIF NEW.assigned_to_team IS NOT NULL THEN
    SELECT ARRAY_AGG(id) INTO assignee_ids 
    FROM simple_users WHERE team_id = NEW.assigned_to_team;
  END IF;
  
  -- Only create notifications if we have assignees
  -- Use FOREACH instead of FOR loop to avoid NULL array_length issue
  IF assignee_ids IS NOT NULL AND array_length(assignee_ids, 1) > 0 THEN
    FOREACH assignee_id IN ARRAY assignee_ids LOOP
      PERFORM create_notification(
        assignee_id,
        'scenario_assigned',
        'scenario_assignment',
        NEW.id,
        'New Scenario Assigned',
        format('You have been assigned "%s" by %s', scenario_title, assigner_name),
        jsonb_build_object(
          'scenario_id', NEW.scenario_id,
          'deadline', NEW.deadline,
          'assigned_by', NEW.assigned_by
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the notify_assignment_completed function with safe logic
CREATE OR REPLACE FUNCTION notify_assignment_completed()
RETURNS TRIGGER AS $$
DECLARE
  scenario_title TEXT;
  assignee_name TEXT;
  manager_id UUID;
BEGIN
  -- Only process if status changed to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get scenario title
    SELECT title INTO scenario_title FROM scenarios WHERE id = NEW.scenario_id;
    
    -- Get assignee name
    SELECT name INTO assignee_name FROM simple_users WHERE id = NEW.assigned_to_user;
    
    -- Get manager ID (who assigned it)
    manager_id := NEW.assigned_by;
    
    -- Create notification for the manager
    IF manager_id IS NOT NULL THEN
      PERFORM create_notification(
        manager_id,
        'assignment_completed',
        'scenario_assignment',
        NEW.id,
        'Assignment Completed',
        format('%s has completed the assignment "%s"', 
               COALESCE(assignee_name, 'Someone'), 
               COALESCE(scenario_title, 'Unknown scenario')),
        jsonb_build_object(
          'scenario_id', NEW.scenario_id,
          'completed_by', NEW.assigned_to_user,
          'score', NEW.score,
          'result', NEW.result,
          'completed_at', NEW.completed_at
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify the functions were created successfully
SELECT 
  proname as function_name,
  'Function updated successfully' as status
FROM pg_proc 
WHERE proname IN ('notify_assignment_created', 'notify_assignment_completed')
ORDER BY proname;