-- Manager Review Dashboard Database Schema
-- This script adds the necessary tables and functions for the manager review workflow
-- Run this in your Supabase SQL Editor after the RBAC setup

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
RETURNS TRIGGER AS $$
DECLARE
  assignment_record scenario_assignments%ROWTYPE;
BEGIN
  -- Get assignment details to find the manager
  SELECT * INTO assignment_record
  FROM scenario_assignments
  WHERE id = NEW.assignment_id;
  
  -- Create call review record for manager
  IF assignment_record.assigned_by IS NOT NULL THEN
    INSERT INTO call_reviews (call_id, assignment_id, reviewer_id, status)
    VALUES (NEW.call_id, NEW.assignment_id, assignment_record.assigned_by, 'pending');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic call review creation
DROP TRIGGER IF EXISTS trigger_create_call_review ON assignment_completions;
CREATE TRIGGER trigger_create_call_review
  AFTER INSERT ON assignment_completions
  FOR EACH ROW
  EXECUTE FUNCTION create_call_review_on_completion();

-- Function to notify manager when call review is submitted
CREATE OR REPLACE FUNCTION notify_manager_review_submitted()
RETURNS TRIGGER AS $$
DECLARE
  call_record calls%ROWTYPE;
  user_name TEXT;
BEGIN
  -- Get call details
  SELECT * INTO call_record
  FROM calls
  WHERE id = NEW.call_id;
  
  -- Get reviewer name
  SELECT name INTO user_name
  FROM simple_users
  WHERE id = NEW.reviewer_id;
  
  -- Notify the staff member who completed the call
  IF call_record.rep_id IS NOT NULL AND NEW.status != 'pending' THEN
    INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
    VALUES (
      call_record.rep_id,
      'call_reviewed',
      'Call Reviewed',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your call "' || COALESCE(call_record.scenario_name, 'Training Call') || '" has been approved by ' || COALESCE(user_name, 'your manager')
        WHEN NEW.status = 'needs_improvement' THEN 'Your call "' || COALESCE(call_record.scenario_name, 'Training Call') || '" needs improvement. Check feedback from ' || COALESCE(user_name, 'your manager')
        WHEN NEW.status = 'rejected' THEN 'Your call "' || COALESCE(call_record.scenario_name, 'Training Call') || '" was not approved. Please review feedback from ' || COALESCE(user_name, 'your manager')
        ELSE 'Your call "' || COALESCE(call_record.scenario_name, 'Training Call') || '" has been reviewed'
      END,
      'call',
      NEW.call_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review notifications
DROP TRIGGER IF EXISTS trigger_notify_review_submitted ON call_reviews;
CREATE TRIGGER trigger_notify_review_submitted
  AFTER UPDATE ON call_reviews
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status != 'pending')
  EXECUTE FUNCTION notify_manager_review_submitted();

-- Function to get team performance metrics for managers
CREATE OR REPLACE FUNCTION get_team_performance_metrics(manager_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_calls INTEGER,
  avg_score NUMERIC,
  pending_reviews INTEGER,
  approved_calls INTEGER,
  team_members INTEGER,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT c.id)::INTEGER as total_calls,
    ROUND(AVG(c.score), 2) as avg_score,
    COUNT(DISTINCT CASE WHEN cr.status = 'pending' THEN cr.id END)::INTEGER as pending_reviews,
    COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.id END)::INTEGER as approved_calls,
    COUNT(DISTINCT su.id)::INTEGER as team_members,
    CASE 
      WHEN COUNT(DISTINCT sa.id) > 0 
      THEN ROUND(COUNT(DISTINCT ac.id)::NUMERIC / COUNT(DISTINCT sa.id) * 100, 2)
      ELSE 0
    END as completion_rate
  FROM simple_users su
  LEFT JOIN calls c ON c.rep_id = su.id AND c.created_at >= NOW() - INTERVAL '1 day' * days_back
  LEFT JOIN call_reviews cr ON cr.call_id = c.id
  LEFT JOIN scenario_assignments sa ON sa.assigned_to_user = su.id AND sa.assigned_by = manager_id
  LEFT JOIN assignment_completions ac ON ac.assignment_id = sa.id
  WHERE su.manager_id = manager_id OR su.id = manager_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for call_reviews table
ALTER TABLE call_reviews ENABLE ROW LEVEL SECURITY;

-- Managers can see reviews they are assigned to
CREATE POLICY "Managers can view their assigned reviews" ON call_reviews
  FOR SELECT USING (
    reviewer_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  );

-- Managers can update reviews they are assigned to
CREATE POLICY "Managers can update their assigned reviews" ON call_reviews
  FOR UPDATE USING (
    reviewer_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  );

-- Admins can see all reviews
CREATE POLICY "Admins can view all reviews" ON call_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

-- Users can see reviews of their own calls
CREATE POLICY "Users can view reviews of their calls" ON call_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calls c 
      WHERE c.id = call_reviews.call_id 
      AND c.rep_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON call_reviews TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_performance_metrics(UUID, INTEGER) TO authenticated;

-- Create test data for development
INSERT INTO notifications (recipient_id, type, title, message)
SELECT 
  id,
  'manager_review_ready',
  'Manager Review Dashboard Ready',
  'Your manager review dashboard is now available with team performance tracking and approval workflow.'
FROM simple_users 
WHERE role IN ('manager', 'admin')
ON CONFLICT DO NOTHING;

-- Verification queries
SELECT 'call_reviews table created' as status, COUNT(*) as count FROM call_reviews;
SELECT 'Triggers created' as status, COUNT(*) as count FROM pg_trigger WHERE tgname LIKE '%call_review%';
SELECT 'Functions created' as status, COUNT(*) as count FROM pg_proc WHERE proname LIKE '%team_performance%';