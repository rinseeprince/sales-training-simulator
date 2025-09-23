-- Manager Review Dashboard Database Schema (Fixed)
-- This script adds the necessary tables and functions for the manager review workflow
-- Run this in your Supabase SQL Editor after the RBAC setup

-- First, update the notifications table to allow new notification types
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'scenario_assigned',
  'assignment_completed', 
  'assignment_overdue',
  'simulation_reviewed',
  'simulation_approved',
  'simulation_rejected',
  'feedback_received',
  'team_update',
  'manager_review_ready',
  'review_completed',
  'review_feedback'
));

-- Create call_reviews table for manager approval workflow
CREATE TABLE IF NOT EXISTS call_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES scenario_assignments(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_improvement', 'rejected')),
  score_override INTEGER CHECK (score_override >= 0 AND score_override <= 100),
  manager_feedback TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add review status to assignment_completions if not exists
ALTER TABLE assignment_completions 
ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'needs_improvement', 'rejected'));

ALTER TABLE assignment_completions 
ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

ALTER TABLE assignment_completions 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE assignment_completions 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES simple_users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_reviews_reviewer_id ON call_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_call_reviews_status ON call_reviews(status);
CREATE INDEX IF NOT EXISTS idx_call_reviews_call_id ON call_reviews(call_id);
CREATE INDEX IF NOT EXISTS idx_assignment_completions_review_status ON assignment_completions(review_status);

-- Function to automatically create call review when assignment is completed
CREATE OR REPLACE FUNCTION create_call_review_on_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  manager_user_id UUID;
  call_record RECORD;
BEGIN
  -- Get the manager for the user who completed the assignment
  SELECT u.manager_id INTO manager_user_id
  FROM simple_users u
  WHERE u.id = NEW.completed_by;
  
  -- If no manager assigned, skip review creation
  IF manager_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the most recent call for this assignment
  SELECT * INTO call_record
  FROM calls 
  WHERE assignment_id = NEW.assignment_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Create call review record if call exists
  IF call_record.id IS NOT NULL THEN
    INSERT INTO call_reviews (
      call_id,
      assignment_id,
      reviewer_id,
      status,
      created_at
    ) VALUES (
      call_record.id,
      NEW.assignment_id,
      manager_user_id,
      'pending',
      NOW()
    );
    
    -- Create notification for manager
    INSERT INTO notifications (
      recipient_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      manager_user_id,
      'manager_review_ready',
      'New Call Ready for Review',
      'A team member has completed an assignment and is ready for your review.',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to send notification when review is completed
CREATE OR REPLACE FUNCTION notify_review_completed()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  review_action TEXT;
BEGIN
  -- Get the user who was reviewed
  SELECT c.rep_id INTO user_id
  FROM calls c
  WHERE c.id = NEW.call_id;
  
  -- Determine the review action message
  CASE NEW.status
    WHEN 'approved' THEN
      review_action := 'Your call has been approved by your manager.';
    WHEN 'needs_improvement' THEN
      review_action := 'Your manager has provided feedback for improvement.';
    WHEN 'rejected' THEN
      review_action := 'Your call needs to be redone. Please review the feedback.';
    ELSE
      review_action := 'Your call has been reviewed by your manager.';
  END CASE;
  
  -- Create notification for the user
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    message,
    created_at
  ) VALUES (
    user_id,
    'review_completed',
    'Call Review Completed',
    review_action,
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_create_call_review_on_completion ON assignment_completions;
CREATE TRIGGER trigger_create_call_review_on_completion
  AFTER INSERT ON assignment_completions
  FOR EACH ROW
  EXECUTE FUNCTION create_call_review_on_completion();

DROP TRIGGER IF EXISTS trigger_notify_review_completed ON call_reviews;
CREATE TRIGGER trigger_notify_review_completed
  AFTER UPDATE OF status ON call_reviews
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status != 'pending')
  EXECUTE FUNCTION notify_review_completed();

-- Team performance metrics function
CREATE OR REPLACE FUNCTION get_team_performance_metrics(manager_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_calls INTEGER,
  avg_score NUMERIC,
  pending_reviews INTEGER,
  approved_calls INTEGER,
  team_members INTEGER,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_filter TIMESTAMP WITH TIME ZONE;
BEGIN
  date_filter := NOW() - INTERVAL '1 day' * days_back;
  
  RETURN QUERY
  WITH team_stats AS (
    SELECT 
      COUNT(DISTINCT u.id) as member_count,
      COUNT(c.id) as call_count,
      AVG(c.score) as average_score,
      COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN cr.status = 'approved' THEN 1 END) as approved_count,
      COUNT(DISTINCT ac.id) as total_assignments,
      COUNT(DISTINCT CASE WHEN ac.completed_at IS NOT NULL THEN ac.id END) as completed_assignments
    FROM simple_users u
    LEFT JOIN calls c ON c.rep_id = u.id AND c.created_at >= date_filter
    LEFT JOIN call_reviews cr ON cr.call_id = c.id
    LEFT JOIN scenario_assignments sa ON sa.assigned_to_user = u.id AND sa.created_at >= date_filter
    LEFT JOIN assignment_completions ac ON ac.assignment_id = sa.id
    WHERE (u.manager_id = get_team_performance_metrics.manager_id OR get_team_performance_metrics.manager_id IN (
      SELECT id FROM simple_users WHERE role = 'admin'
    ))
  )
  SELECT 
    COALESCE(ts.call_count, 0)::INTEGER,
    COALESCE(ts.average_score, 0)::NUMERIC,
    COALESCE(ts.pending_count, 0)::INTEGER,
    COALESCE(ts.approved_count, 0)::INTEGER,
    COALESCE(ts.member_count, 0)::INTEGER,
    CASE 
      WHEN ts.total_assignments > 0 THEN (ts.completed_assignments::NUMERIC / ts.total_assignments::NUMERIC * 100)
      ELSE 0
    END::NUMERIC
  FROM team_stats ts;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON call_reviews TO authenticated;
GRANT SELECT, UPDATE ON assignment_completions TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_performance_metrics(UUID, INTEGER) TO authenticated;

-- Enable RLS
ALTER TABLE call_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_reviews
CREATE POLICY "Managers can view team member reviews" ON call_reviews
  FOR SELECT USING (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Managers can insert team member reviews" ON call_reviews
  FOR INSERT WITH CHECK (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Managers can update team member reviews" ON call_reviews
  FOR UPDATE USING (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Manager Review Dashboard schema installed successfully!';
  RAISE NOTICE 'You can now use the manager dashboard features.';
END $$;