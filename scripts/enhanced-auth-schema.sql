-- Enhanced Database Schema for Role-Based Authentication System
-- Run this in your Supabase SQL Editor

-- First, create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scenario_visibility AS ENUM ('personal', 'manager_shared', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced users table with role-based features
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'user',
  name TEXT,
  department TEXT DEFAULT 'Sales',
  manager_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User permissions table for manager-specific settings
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  allow_user_saving BOOLEAN DEFAULT TRUE,
  allow_scenario_sharing BOOLEAN DEFAULT FALSE,
  max_scenarios_per_user INTEGER DEFAULT 50,
  custom_permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id)
);

-- Enhanced scenarios table with visibility controls
CREATE TABLE IF NOT EXISTS enhanced_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  visibility scenario_visibility DEFAULT 'personal',
  is_template BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  persona TEXT,
  difficulty TEXT DEFAULT 'medium',
  industry TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario access control table
CREATE TABLE IF NOT EXISTS scenario_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES enhanced_scenarios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  access_type TEXT DEFAULT 'read' CHECK (access_type IN ('read', 'write', 'admin')),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(scenario_id, user_id)
);

-- Invitation tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  assigned_role user_role DEFAULT 'user',
  assigned_manager_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enhanced calls table with permission tracking
CREATE TABLE IF NOT EXISTS enhanced_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES enhanced_scenarios(id) ON DELETE SET NULL,
  scenario_name TEXT NOT NULL,
  transcript JSONB DEFAULT '[]',
  score INTEGER,
  talk_ratio DECIMAL,
  objections_handled INTEGER,
  cta_used BOOLEAN,
  sentiment TEXT,
  feedback TEXT[],
  duration INTEGER,
  audio_url TEXT,
  audio_duration INTEGER,
  audio_file_size INTEGER,
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with UUID[] DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table for security tracking
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role);
CREATE INDEX IF NOT EXISTS idx_auth_users_manager_id ON auth_users(manager_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_scenarios_created_by ON enhanced_scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_enhanced_scenarios_visibility ON enhanced_scenarios(visibility);
CREATE INDEX IF NOT EXISTS idx_scenario_access_user_id ON scenario_access(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_access_scenario_id ON scenario_access(scenario_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_enhanced_calls_rep_id ON enhanced_calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Enable Row Level Security
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- Auth Users Policies
CREATE POLICY "Users can view their own profile and their manager's team" ON auth_users
FOR SELECT USING (
  id = auth.uid() OR 
  manager_id = auth.uid() OR 
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can update their own profile" ON auth_users
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all users" ON auth_users
FOR ALL USING ((SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Managers can view their assigned users" ON auth_users
FOR SELECT USING (
  manager_id = auth.uid() OR 
  id = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

-- User Permissions Policies
CREATE POLICY "Managers can manage their own permissions" ON user_permissions
FOR ALL USING (manager_id = auth.uid());

CREATE POLICY "Admins can manage all permissions" ON user_permissions
FOR ALL USING ((SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin');

-- Enhanced Scenarios Policies
CREATE POLICY "Users can view accessible scenarios" ON enhanced_scenarios
FOR SELECT USING (
  created_by = auth.uid() OR
  visibility = 'public' OR
  (visibility = 'manager_shared' AND 
   (SELECT manager_id FROM auth_users WHERE id = auth.uid()) = created_by) OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin' OR
  EXISTS (SELECT 1 FROM scenario_access WHERE scenario_id = id AND user_id = auth.uid())
);

CREATE POLICY "Users can create scenarios if permitted" ON enhanced_scenarios
FOR INSERT WITH CHECK (
  created_by = auth.uid() AND
  (
    (SELECT role FROM auth_users WHERE id = auth.uid()) IN ('admin', 'manager') OR
    (
      SELECT COALESCE(up.allow_user_saving, TRUE)
      FROM user_permissions up
      JOIN auth_users u ON u.manager_id = up.manager_id
      WHERE u.id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own scenarios" ON enhanced_scenarios
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own scenarios" ON enhanced_scenarios
FOR DELETE USING (
  created_by = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

-- Scenario Access Policies
CREATE POLICY "Users can view their scenario access" ON scenario_access
FOR SELECT USING (
  user_id = auth.uid() OR
  granted_by = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Managers and admins can grant scenario access" ON scenario_access
FOR INSERT WITH CHECK (
  granted_by = auth.uid() AND
  (SELECT role FROM auth_users WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Invitation Tokens Policies
CREATE POLICY "Admins and managers can view their invitations" ON invitation_tokens
FOR SELECT USING (
  invited_by = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins and managers can create invitations" ON invitation_tokens
FOR INSERT WITH CHECK (
  invited_by = auth.uid() AND
  (SELECT role FROM auth_users WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Enhanced Calls Policies
CREATE POLICY "Users can view their own calls and their team's calls" ON enhanced_calls
FOR SELECT USING (
  rep_id = auth.uid() OR
  (SELECT manager_id FROM auth_users WHERE id = rep_id) = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Users can create their own calls" ON enhanced_calls
FOR INSERT WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Users can update their own calls" ON enhanced_calls
FOR UPDATE USING (rep_id = auth.uid());

-- Audit Log Policies
CREATE POLICY "Users can view their own audit logs" ON auth_audit_log
FOR SELECT USING (
  user_id = auth.uid() OR
  (SELECT role FROM auth_users WHERE id = auth.uid()) = 'admin'
);

-- Session Policies
CREATE POLICY "Users can manage their own sessions" ON user_sessions
FOR ALL USING (user_id = auth.uid());

-- Create functions for common operations

-- Function to check if user can save scenarios
CREATE OR REPLACE FUNCTION can_user_save_scenarios(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  manager_allows BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM auth_users WHERE id = user_uuid;
  
  -- Admins and managers can always save
  IF user_role IN ('admin', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if manager allows user saving
  SELECT COALESCE(up.allow_user_saving, TRUE) INTO manager_allows
  FROM user_permissions up
  JOIN auth_users u ON u.manager_id = up.manager_id
  WHERE u.id = user_uuid;
  
  RETURN COALESCE(manager_allows, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible scenarios
CREATE OR REPLACE FUNCTION get_accessible_scenarios(user_uuid UUID)
RETURNS TABLE(scenario_id UUID, title TEXT, visibility scenario_visibility) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.visibility
  FROM enhanced_scenarios s
  WHERE 
    s.created_by = user_uuid OR
    s.visibility = 'public' OR
    (s.visibility = 'manager_shared' AND 
     (SELECT manager_id FROM auth_users WHERE id = user_uuid) = s.created_by) OR
    (SELECT role FROM auth_users WHERE id = user_uuid) = 'admin' OR
    EXISTS (SELECT 1 FROM scenario_access WHERE scenario_id = s.id AND user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO auth_audit_log (
    user_id, action, resource_type, resource_id, 
    ip_address, user_agent, metadata, success, error_message
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id,
    p_ip_address, p_user_agent, p_metadata, p_success, p_error_message
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_enhanced_scenarios_updated_at BEFORE UPDATE ON enhanced_scenarios
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_enhanced_calls_updated_at BEFORE UPDATE ON enhanced_calls
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default admin user (update with actual details)
INSERT INTO auth_users (email, password_hash, role, name, email_verified)
VALUES (
  'admin@salestraining.com',
  '$2b$10$placeholder.hash.replace.with.real', -- Replace with actual bcrypt hash
  'admin',
  'System Administrator',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Create default permissions for the admin user
INSERT INTO user_permissions (manager_id, allow_user_saving, allow_scenario_sharing)
SELECT id, TRUE, TRUE FROM auth_users WHERE email = 'admin@salestraining.com'
ON CONFLICT (manager_id) DO NOTHING;
