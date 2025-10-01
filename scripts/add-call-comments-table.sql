-- Create proper call comments table for multiple manager feedback comments
-- This replaces the single manager_feedback field with a proper comments system

-- Create call_comments table for multiple feedback comments
CREATE TABLE IF NOT EXISTS call_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES simple_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_author_id ON call_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON call_comments(created_at);

-- Enable RLS
ALTER TABLE call_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_comments (organization-aware)
-- Allow users to view comments on their own calls
CREATE POLICY "Users can view comments on own calls" ON call_comments
FOR SELECT USING (
  call_id IN (
    SELECT id FROM calls 
    WHERE rep_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  )
  OR
  -- Managers/admins can view comments on calls within their organization
  EXISTS (
    SELECT 1 FROM simple_users commenter
    JOIN calls c ON c.id = call_comments.call_id
    JOIN simple_users call_owner ON call_owner.id = c.rep_id
    WHERE commenter.auth_user_id = auth.uid() 
    AND commenter.role IN ('manager', 'admin')
    AND commenter.organization_id = call_owner.organization_id
  )
);

-- Allow managers/admins to add comments to calls within their organization
CREATE POLICY "Managers can add comments to organization calls" ON call_comments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM simple_users commenter
    JOIN calls c ON c.id = call_comments.call_id
    JOIN simple_users call_owner ON call_owner.id = c.rep_id
    WHERE commenter.id = call_comments.author_id
    AND commenter.auth_user_id = auth.uid()
    AND commenter.role IN ('manager', 'admin')
    AND commenter.organization_id = call_owner.organization_id
  )
);

-- Function to automatically notify users when a comment is added
CREATE OR REPLACE FUNCTION notify_call_comment_added()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  call_user_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get the user who owns the call
  SELECT rep_id INTO call_user_id
  FROM calls
  WHERE id = NEW.call_id;
  
  -- Get the commenter's name
  SELECT name INTO commenter_name
  FROM simple_users
  WHERE id = NEW.author_id;
  
  -- Create notification for the user (only if commenter is not the call owner)
  IF call_user_id != NEW.author_id THEN
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
      'New Manager Feedback',
      COALESCE(commenter_name, 'Your manager') || ' has left feedback on your call.',
      'call',
      NEW.call_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment notifications
DROP TRIGGER IF EXISTS trigger_notify_call_comment ON call_comments;
CREATE TRIGGER trigger_notify_call_comment
  AFTER INSERT ON call_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_call_comment_added();

-- Grant permissions
GRANT SELECT, INSERT ON call_comments TO authenticated;

-- Migrate existing manager_feedback data to comments table
-- This preserves any existing feedback
INSERT INTO call_comments (call_id, author_id, content, created_at)
SELECT 
  id as call_id,
  manager_feedback_by as author_id,
  manager_feedback as content,
  COALESCE(manager_feedback_at, created_at) as created_at
FROM calls 
WHERE manager_feedback IS NOT NULL 
  AND manager_feedback != '' 
  AND manager_feedback_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- Show the new table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_comments' 
ORDER BY ordinal_position;