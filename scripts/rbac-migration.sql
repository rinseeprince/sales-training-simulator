-- RBAC and Scenario Assignment Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. UPDATE USER ROLES
-- ============================================

-- First, add role column to simple_users if not exists
ALTER TABLE simple_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'manager', 'admin'));

-- Add team_id for organizational structure
ALTER TABLE simple_users
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES simple_users(id) ON DELETE SET NULL;

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for team_id
ALTER TABLE simple_users
ADD CONSTRAINT fk_user_team 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================
-- 2. SCENARIO ASSIGNMENTS
-- ============================================

-- Add company_generated flag to scenarios
ALTER TABLE scenarios
ADD COLUMN IF NOT EXISTS is_company_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES simple_users(id) ON DELETE SET NULL;

-- Create scenario assignments table
CREATE TABLE IF NOT EXISTS scenario_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  assigned_to_user UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  assigned_to_team UUID REFERENCES teams(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  result TEXT CHECK (result IN ('pass', 'fail', NULL)),
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure assignment is to either a user or a team, not both
  CONSTRAINT assignment_target CHECK (
    (assigned_to_user IS NOT NULL AND assigned_to_team IS NULL) OR
    (assigned_to_user IS NULL AND assigned_to_team IS NOT NULL)
  )
);

-- Create index for efficient queries
CREATE INDEX idx_scenario_assignments_user ON scenario_assignments(assigned_to_user);
CREATE INDEX idx_scenario_assignments_team ON scenario_assignments(assigned_to_team);
CREATE INDEX idx_scenario_assignments_status ON scenario_assignments(status);
CREATE INDEX idx_scenario_assignments_deadline ON scenario_assignments(deadline);

-- ============================================
-- 3. SIMULATIONS ENHANCEMENTS
-- ============================================

-- Add fields to calls table for enhanced tracking
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS scenario_assignment_id UUID REFERENCES scenario_assignments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_company_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'reviewed')),
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS request_retry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES simple_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create simulation feedback table
CREATE TABLE IF NOT EXISTS simulation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  author_id UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  feedback_type TEXT DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'coaching', 'approval', 'rejection')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_simulation_feedback_simulation ON simulation_feedback(simulation_id);
CREATE INDEX idx_simulation_feedback_author ON simulation_feedback(author_id);

-- ============================================
-- 4. NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'scenario_assigned',
    'assignment_completed',
    'assignment_overdue',
    'simulation_reviewed',
    'simulation_approved',
    'simulation_rejected',
    'retry_requested',
    'feedback_received'
  )),
  entity_type TEXT CHECK (entity_type IN ('scenario_assignment', 'simulation', 'feedback')),
  entity_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================
-- 5. ACTIVITY LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view their own team" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM simple_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Managers can view all teams" ON teams
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- Scenario assignments policies
CREATE POLICY "Users can view their own assignments" ON scenario_assignments
  FOR SELECT USING (
    assigned_to_user IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
    OR
    assigned_to_team IN (SELECT team_id FROM simple_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Managers can view all assignments" ON scenario_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "Managers can create assignments" ON scenario_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "Managers can update assignments" ON scenario_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- Simulation feedback policies
CREATE POLICY "Users can view feedback on their simulations" ON simulation_feedback
  FOR SELECT USING (
    simulation_id IN (
      SELECT id FROM calls WHERE rep_id IN (
        SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
      )
    )
    OR
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

CREATE POLICY "Managers can create feedback" ON simulation_feedback
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    recipient_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    recipient_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  );

-- Update existing scenarios policies for RBAC
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
CREATE POLICY "Users can view scenarios" ON scenarios
  FOR SELECT USING (
    -- Users can see their own scenarios
    user_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
    OR
    -- Users can see assigned scenarios
    id IN (
      SELECT scenario_id FROM scenario_assignments 
      WHERE assigned_to_user IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
      OR assigned_to_team IN (SELECT team_id FROM simple_users WHERE auth_user_id = auth.uid())
    )
    OR
    -- Managers/Admins can see all scenarios
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- Update existing calls policies for RBAC
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
CREATE POLICY "Users can view calls" ON calls
  FOR SELECT USING (
    -- Users can see their own calls
    rep_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
    OR
    -- Managers/Admins can see all calls
    EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
  );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM simple_users 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM simple_users
  WHERE auth_user_id = auth.uid();
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id UUID,
  p_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    recipient_id, type, entity_type, entity_id, 
    title, message, payload
  ) VALUES (
    p_recipient_id, p_type, p_entity_type, p_entity_id,
    p_title, p_message, p_payload
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger to notify on assignment creation
CREATE OR REPLACE FUNCTION notify_assignment_created()
RETURNS TRIGGER AS $$
DECLARE
  scenario_title TEXT;
  assigner_name TEXT;
  assignee_ids UUID[];
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
  
  -- Create notifications for each assignee
  FOR i IN 1..array_length(assignee_ids, 1) LOOP
    PERFORM create_notification(
      assignee_ids[i],
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_assignment_created
AFTER INSERT ON scenario_assignments
FOR EACH ROW EXECUTE FUNCTION notify_assignment_created();

-- Trigger to notify on assignment completion
CREATE OR REPLACE FUNCTION notify_assignment_completed()
RETURNS TRIGGER AS $$
DECLARE
  scenario_title TEXT;
  rep_name TEXT;
  manager_ids UUID[];
BEGIN
  -- Only trigger on status change to completed
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    -- Get scenario title
    SELECT title INTO scenario_title FROM scenarios WHERE id = NEW.scenario_id;
    
    -- Get rep name
    SELECT name INTO rep_name FROM simple_users WHERE id = NEW.assigned_to_user;
    
    -- Get managers to notify (assigned_by and all managers/admins)
    SELECT ARRAY_AGG(DISTINCT id) INTO manager_ids
    FROM simple_users 
    WHERE (id = NEW.assigned_by OR role IN ('manager', 'admin'))
    AND id != NEW.assigned_to_user;
    
    -- Create notifications
    FOR i IN 1..array_length(manager_ids, 1) LOOP
      PERFORM create_notification(
        manager_ids[i],
        'assignment_completed',
        'scenario_assignment',
        NEW.id,
        'Assignment Completed',
        format('%s completed "%s" with %s', 
          rep_name, 
          scenario_title, 
          CASE WHEN NEW.result = 'pass' THEN 'a passing score' ELSE 'a failing score' END
        ),
        jsonb_build_object(
          'scenario_id', NEW.scenario_id,
          'completed_by', NEW.assigned_to_user,
          'result', NEW.result,
          'score', NEW.score
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_assignment_completed
AFTER UPDATE ON scenario_assignments
FOR EACH ROW EXECUTE FUNCTION notify_assignment_completed();

-- Function to check for overdue assignments (to be called by cron job)
CREATE OR REPLACE FUNCTION check_overdue_assignments()
RETURNS void AS $$
DECLARE
  assignment RECORD;
  scenario_title TEXT;
  rep_name TEXT;
  manager_ids UUID[];
BEGIN
  -- Find all assignments that just became overdue
  FOR assignment IN 
    SELECT * FROM scenario_assignments 
    WHERE status != 'completed' 
    AND status != 'overdue'
    AND deadline < NOW()
  LOOP
    -- Update status to overdue
    UPDATE scenario_assignments 
    SET status = 'overdue', updated_at = NOW()
    WHERE id = assignment.id;
    
    -- Get scenario title
    SELECT title INTO scenario_title FROM scenarios WHERE id = assignment.scenario_id;
    
    -- Get rep name
    SELECT name INTO rep_name FROM simple_users WHERE id = assignment.assigned_to_user;
    
    -- Get managers to notify
    SELECT ARRAY_AGG(DISTINCT id) INTO manager_ids
    FROM simple_users 
    WHERE (id = assignment.assigned_by OR role IN ('manager', 'admin'));
    
    -- Create notifications
    FOR i IN 1..array_length(manager_ids, 1) LOOP
      PERFORM create_notification(
        manager_ids[i],
        'assignment_overdue',
        'scenario_assignment',
        assignment.id,
        'Assignment Overdue',
        format('%s has not completed "%s" by the deadline', rep_name, scenario_title),
        jsonb_build_object(
          'scenario_id', assignment.scenario_id,
          'assigned_to', assignment.assigned_to_user,
          'deadline', assignment.deadline
        )
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. SEED DATA FOR TESTING
-- ============================================

-- Insert test teams
INSERT INTO teams (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Sales Team A', 'Enterprise Sales Team'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sales Team B', 'SMB Sales Team')
ON CONFLICT DO NOTHING;

-- Update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for all tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_assignments_updated_at BEFORE UPDATE ON scenario_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_feedback_updated_at BEFORE UPDATE ON simulation_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 