-- ================================================
-- Complete RBAC Setup for Sales Training Simulator
-- ================================================
-- Run this script in your Supabase SQL Editor
-- This script safely creates all RBAC structures

-- ========================================
-- STEP 1: Drop existing objects if needed (for clean setup)
-- ========================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_assignment_created ON scenario_assignments;
DROP TRIGGER IF EXISTS trigger_notify_assignment_completed ON assignment_completions;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS notify_assignment_created();
DROP FUNCTION IF EXISTS notify_assignment_completed();
DROP FUNCTION IF EXISTS is_manager(UUID);
DROP FUNCTION IF EXISTS get_team_members(UUID);

-- ========================================
-- STEP 2: Create teams table
-- ========================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: Add team_id to simple_users if not exists
-- ========================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simple_users' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE simple_users ADD COLUMN team_id UUID;
  END IF;
END $$;

-- Add foreign key constraint for team_id
ALTER TABLE simple_users
DROP CONSTRAINT IF EXISTS simple_users_team_id_fkey;

ALTER TABLE simple_users
ADD CONSTRAINT simple_users_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ========================================
-- STEP 4: Create notifications table with proper column name
-- ========================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES simple_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'scenario_assigned',
    'assignment_completed', 
    'assignment_overdue',
    'simulation_reviewed',
    'simulation_approved',
    'simulation_rejected',
    'feedback_received',
    'team_update'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 5: Create scenario_assignments table
-- ========================================

CREATE TABLE IF NOT EXISTS scenario_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  assigned_to_user UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  assigned_to_team UUID REFERENCES teams(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'overdue')),
  approved_by UUID REFERENCES simple_users(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure assignment is to either a user OR a team, not both
  CONSTRAINT assignment_target_check CHECK (
    (assigned_to_user IS NOT NULL AND assigned_to_team IS NULL) OR
    (assigned_to_user IS NULL AND assigned_to_team IS NOT NULL)
  )
);

-- ========================================
-- STEP 6: Create assignment_completions table
-- ========================================

CREATE TABLE IF NOT EXISTS assignment_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES scenario_assignments(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES simple_users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, completed_by)
);

-- ========================================
-- STEP 7: Create simulation_feedback table
-- ========================================

CREATE TABLE IF NOT EXISTS simulation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES simple_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  feedback_type TEXT DEFAULT 'comment' CHECK (feedback_type IN ('comment', 'coaching', 'approval', 'rejection')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 8: Add RBAC columns to existing tables
-- ========================================

-- Add columns to calls table for assignment tracking
DO $$ 
BEGIN
  -- scenario_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'scenario_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL;
  END IF;
  
  -- scenario_assignment_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'scenario_assignment_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN scenario_assignment_id UUID REFERENCES scenario_assignments(id) ON DELETE SET NULL;
  END IF;
  
  -- status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'status'
  ) THEN
    ALTER TABLE calls ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'reviewed'));
  END IF;
  
  -- approved column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'approved'
  ) THEN
    ALTER TABLE calls ADD COLUMN approved BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- certified column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'certified'
  ) THEN
    ALTER TABLE calls ADD COLUMN certified BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- reviewed_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE calls ADD COLUMN reviewed_by UUID REFERENCES simple_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add columns to scenarios table
DO $$ 
BEGIN
  -- created_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenarios' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN created_by UUID REFERENCES simple_users(id) ON DELETE SET NULL;
  END IF;
  
  -- is_company_generated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenarios' AND column_name = 'is_company_generated'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN is_company_generated BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- voice_settings column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenarios' AND column_name = 'voice_settings'
  ) THEN
    ALTER TABLE scenarios ADD COLUMN voice_settings JSONB;
  END IF;
END $$;

-- ========================================
-- STEP 9: Create indexes for performance
-- ========================================

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_manager_id ON teams(manager_id);

-- Simple users indexes
CREATE INDEX IF NOT EXISTS idx_simple_users_team_id ON simple_users(team_id);
CREATE INDEX IF NOT EXISTS idx_simple_users_manager_id ON simple_users(manager_id);
CREATE INDEX IF NOT EXISTS idx_simple_users_role ON simple_users(role);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Scenario assignments indexes
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_scenario_id ON scenario_assignments(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_by ON scenario_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_user ON scenario_assignments(assigned_to_user);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_team ON scenario_assignments(assigned_to_team);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_status ON scenario_assignments(status);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_deadline ON scenario_assignments(deadline);

-- Assignment completions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment_id ON assignment_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_completions_call_id ON assignment_completions(call_id);
CREATE INDEX IF NOT EXISTS idx_assignment_completions_completed_by ON assignment_completions(completed_by);

-- Simulation feedback indexes
CREATE INDEX IF NOT EXISTS idx_simulation_feedback_simulation_id ON simulation_feedback(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_feedback_author_id ON simulation_feedback(author_id);

-- Calls indexes for RBAC
CREATE INDEX IF NOT EXISTS idx_calls_scenario_id ON calls(scenario_id);
CREATE INDEX IF NOT EXISTS idx_calls_scenario_assignment_id ON calls(scenario_assignment_id);
CREATE INDEX IF NOT EXISTS idx_calls_reviewed_by ON calls(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- ========================================
-- STEP 10: Create helper functions
-- ========================================

-- Function to check if user is a manager or admin
CREATE OR REPLACE FUNCTION is_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM simple_users 
    WHERE id = user_id AND role IN ('manager', 'admin')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get team members for a manager
CREATE OR REPLACE FUNCTION get_team_members(manager_user_id UUID)
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  department TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.department
  FROM simple_users u
  WHERE u.manager_id = manager_user_id
     OR u.team_id IN (SELECT t.id FROM teams t WHERE t.manager_id = manager_user_id)
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get users in the same domain
CREATE OR REPLACE FUNCTION get_domain_users(user_email TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  department TEXT
) AS $$
DECLARE
  domain TEXT;
BEGIN
  -- Extract domain from email
  domain := SPLIT_PART(user_email, '@', 2);
  
  RETURN QUERY
  SELECT u.id, u.email, u.name, u.role, u.department
  FROM simple_users u
  WHERE SPLIT_PART(u.email, '@', 2) = domain
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 11: Create notification triggers
-- ========================================

-- Trigger function for when assignment is created
CREATE OR REPLACE FUNCTION notify_assignment_created()
RETURNS TRIGGER AS $$
DECLARE
  scenario_title TEXT;
  assigner_name TEXT;
BEGIN
  -- Get scenario title
  SELECT title INTO scenario_title
  FROM scenarios
  WHERE id = NEW.scenario_id;
  
  -- Get assigner name
  SELECT name INTO assigner_name
  FROM simple_users
  WHERE id = NEW.assigned_by;
  
  -- Notify individual user
  IF NEW.assigned_to_user IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.assigned_to_user,
      'scenario_assigned',
      'New Training Assignment',
      COALESCE(assigner_name, 'Your manager') || ' assigned you: ' || COALESCE(scenario_title, 'Training Scenario'),
      'scenario_assignment',
      NEW.id
    );
  END IF;
  
  -- Notify team members
  IF NEW.assigned_to_team IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, title, message, entity_type, entity_id)
    SELECT 
      u.id,
      'scenario_assigned',
      'New Team Assignment',
      COALESCE(assigner_name, 'Your manager') || ' assigned to team: ' || COALESCE(scenario_title, 'Training Scenario'),
      'scenario_assignment',
      NEW.id
    FROM simple_users u
    WHERE u.team_id = NEW.assigned_to_team;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_notify_assignment_created
AFTER INSERT ON scenario_assignments
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_created();

-- Trigger function for when assignment is completed
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
  
  -- Notify the manager who assigned it
  IF assignment_record.assigned_by IS NOT NULL THEN
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
  
  -- Update assignment status
  UPDATE scenario_assignments
  SET status = 'completed',
      call_id = NEW.call_id,
      updated_at = NOW()
  WHERE id = NEW.assignment_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_notify_assignment_completed
AFTER INSERT ON assignment_completions
FOR EACH ROW
EXECUTE FUNCTION notify_assignment_completed();

-- ========================================
-- STEP 12: Enable Row Level Security (RLS)
-- ========================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_feedback ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 13: Create RLS Policies
-- ========================================

-- Teams policies
DROP POLICY IF EXISTS "Users can view their own team" ON teams;
CREATE POLICY "Users can view their own team" ON teams
FOR SELECT USING (true); -- All authenticated users can see teams

DROP POLICY IF EXISTS "Managers can manage their teams" ON teams;
CREATE POLICY "Managers can manage their teams" ON teams
FOR ALL USING (
  manager_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications
FOR SELECT USING (
  recipient_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
CREATE POLICY "Users can update their notifications" ON notifications
FOR UPDATE USING (
  recipient_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Scenario assignments policies
DROP POLICY IF EXISTS "Users can view their assignments" ON scenario_assignments;
CREATE POLICY "Users can view their assignments" ON scenario_assignments
FOR SELECT USING (
  assigned_to_user IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR assigned_by IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR assigned_to_team IN (SELECT team_id FROM simple_users WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can create assignments" ON scenario_assignments;
CREATE POLICY "Managers can create assignments" ON scenario_assignments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
);

-- ========================================
-- STEP 14: Insert test notification
-- ========================================

INSERT INTO notifications (recipient_id, type, title, message)
VALUES (
  '8f306c9c-2778-4c4a-834a-2b08ee1c962d', -- Your user ID
  'team_update',
  'RBAC System Activated',
  'Role-based access control is now active. You can assign scenarios to team members.'
)
ON CONFLICT DO NOTHING;

-- ========================================
-- STEP 15: Verification queries
-- ========================================

-- Check if all tables were created
SELECT 
  'Tables Created' as check_type,
  COUNT(*) as count,
  string_agg(table_name, ', ') as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('teams', 'scenario_assignments', 'notifications', 'assignment_completions', 'simulation_feedback');

-- Check notification for your user
SELECT 
  'Test Notification' as check_type,
  COUNT(*) as count
FROM notifications 
WHERE recipient_id = '8f306c9c-2778-4c4a-834a-2b08ee1c962d';

-- Show table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND table_schema = 'public'
ORDER BY ordinal_position; 