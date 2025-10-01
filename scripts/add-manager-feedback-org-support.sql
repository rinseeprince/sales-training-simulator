-- Add manager feedback functionality to calls table (Organization-aware)
-- This adds manager feedback fields compatible with the new organization structure

-- Add manager_feedback column to calls table if it doesn't exist
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS manager_feedback TEXT;

-- Add manager_feedback_by column to track who left the feedback (references simple_users)
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS manager_feedback_by UUID REFERENCES simple_users(id) ON DELETE SET NULL;

-- Add manager_feedback_at timestamp 
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS manager_feedback_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_manager_feedback_by ON calls(manager_feedback_by);
CREATE INDEX IF NOT EXISTS idx_calls_manager_feedback_at ON calls(manager_feedback_at);

-- Create RLS policy for manager feedback (organization-aware)
-- Allow managers/admins to add feedback to calls within their organization
CREATE POLICY "Managers can add feedback to organization calls" ON calls
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM simple_users feedback_user
    JOIN simple_users call_user ON call_user.id = calls.rep_id
    WHERE feedback_user.auth_user_id = auth.uid() 
    AND feedback_user.role IN ('manager', 'admin')
    AND feedback_user.organization_id = call_user.organization_id
  )
);

-- Allow users to view manager feedback on their own calls
CREATE POLICY "Users can view manager feedback on own calls" ON calls
FOR SELECT USING (
  rep_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM simple_users
    WHERE auth_user_id = auth.uid() 
    AND role IN ('manager', 'admin')
    AND organization_id = (SELECT organization_id FROM simple_users WHERE id = calls.rep_id)
  )
);

-- Function to automatically notify users when manager feedback is added
CREATE OR REPLACE FUNCTION notify_manager_feedback_added()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  call_user_id UUID;
  manager_name TEXT;
BEGIN
  -- Only proceed if manager_feedback was actually updated
  IF OLD.manager_feedback IS DISTINCT FROM NEW.manager_feedback AND NEW.manager_feedback IS NOT NULL THEN
    
    -- Get the user who owns the call
    SELECT rep_id INTO call_user_id
    FROM calls
    WHERE id = NEW.id;
    
    -- Get the manager's name
    SELECT name INTO manager_name
    FROM simple_users
    WHERE id = NEW.manager_feedback_by;
    
    -- Create notification for the user
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      created_at
    ) VALUES (
      call_user_id,
      'feedback_received',
      'Manager Feedback Added',
      COALESCE(manager_name, 'Your manager') || ' has left feedback on your call.',
      'call',
      NEW.id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for manager feedback notifications
DROP TRIGGER IF EXISTS trigger_notify_manager_feedback ON calls;
CREATE TRIGGER trigger_notify_manager_feedback
  AFTER UPDATE OF manager_feedback ON calls
  FOR EACH ROW
  EXECUTE FUNCTION notify_manager_feedback_added();

-- Show the current calls table structure with new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name LIKE '%manager_feedback%'
ORDER BY ordinal_position;