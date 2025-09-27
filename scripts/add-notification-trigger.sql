-- Add trigger to create notifications when assignment_completions review_status is updated
-- This ensures users get notified when their assignments are approved/rejected by managers

CREATE OR REPLACE FUNCTION notify_assignment_review_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_id UUID;
  review_action TEXT;
  call_scenario_name TEXT;
  manager_name TEXT;
BEGIN
  -- Only trigger on review_status changes from pending to something else
  IF OLD.review_status = 'pending' AND NEW.review_status != 'pending' THEN
    
    -- Get the user who was reviewed and the call scenario name
    SELECT c.rep_id, c.scenario_name INTO user_id, call_scenario_name
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Get the manager's name who did the review
    SELECT su.name INTO manager_name
    FROM simple_users su
    WHERE su.id = NEW.reviewed_by;
    
    -- Determine the review action message based on status
    IF NEW.review_status = 'approved' THEN
      review_action := 'Congratulations! Your assignment "' || COALESCE(call_scenario_name, 'Training Call') || '" has been approved by ' || COALESCE(manager_name, 'your manager') || '. You can now delete this assignment if desired.';
    ELSIF NEW.review_status = 'needs_improvement' THEN
      review_action := 'Your assignment "' || COALESCE(call_scenario_name, 'Training Call') || '" needs improvement. Please review the feedback from ' || COALESCE(manager_name, 'your manager') || '.';
    ELSIF NEW.review_status = 'rejected' THEN
      review_action := 'Your assignment "' || COALESCE(call_scenario_name, 'Training Call') || '" was not approved. Please review the feedback from ' || COALESCE(manager_name, 'your manager') || ' and try again.';
    ELSE
      review_action := 'Your assignment "' || COALESCE(call_scenario_name, 'Training Call') || '" has been reviewed by ' || COALESCE(manager_name, 'your manager') || '.';
    END IF;
    
    -- Create notification for the user
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      is_read
    ) VALUES (
      user_id,
      CASE 
        WHEN NEW.review_status = 'approved' THEN 'assignment_approved'
        WHEN NEW.review_status = 'needs_improvement' THEN 'assignment_needs_improvement'
        WHEN NEW.review_status = 'rejected' THEN 'assignment_rejected'
        ELSE 'assignment_reviewed'
      END,
      CASE 
        WHEN NEW.review_status = 'approved' THEN 'Assignment Approved! 🎉'
        WHEN NEW.review_status = 'needs_improvement' THEN 'Assignment Needs Improvement'
        WHEN NEW.review_status = 'rejected' THEN 'Assignment Not Approved'
        ELSE 'Assignment Reviewed'
      END,
      review_action,
      false
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_assignment_review_completed ON assignment_completions;
CREATE TRIGGER trigger_notify_assignment_review_completed
  AFTER UPDATE OF review_status ON assignment_completions
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_review_completed();

-- Test that the trigger works by selecting some sample data
-- SELECT 'Trigger created successfully for assignment completion notifications' as status;