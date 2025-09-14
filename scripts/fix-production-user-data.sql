-- Fix Production User Data Issues
-- Run this in your Production Supabase SQL Editor

-- 1. First, let's check the current state of tables
SELECT 'simple_users count' as check_type, COUNT(*) as count FROM simple_users
UNION ALL
SELECT 'auth.users count', COUNT(*) FROM auth.users
UNION ALL
SELECT 'scenarios count', COUNT(*) FROM scenarios
UNION ALL
SELECT 'scenario_assignments exists', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scenario_assignments' AND table_schema = 'public') THEN 1 ELSE 0 END;

-- 2. Check for missing auth_user_id mappings
SELECT 
  'Missing auth_user_id mappings' as issue_type,
  COUNT(*) as count
FROM simple_users 
WHERE auth_user_id IS NULL;

-- 3. Check for users without RBAC columns
SELECT 
  'Users without role' as issue_type,
  COUNT(*) as count
FROM simple_users 
WHERE role IS NULL;

-- 4. Add missing RBAC columns if they don't exist
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS manager_id UUID,
ADD COLUMN IF NOT EXISTS simulation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS simulation_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 5. Create scenario_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS scenario_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  assigned_to_user UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  assigned_to_team UUID,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  result TEXT CHECK (result IN ('pass', 'fail')),
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create activity_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Update subscription status for known paid users (replace with your actual email)
-- UPDATE simple_users 
-- SET subscription_status = 'paid' 
-- WHERE email = 'your-email@domain.com';

-- 9. Sync auth_user_id for existing users (this requires manual intervention)
-- You'll need to run this for each user individually:
-- UPDATE simple_users 
-- SET auth_user_id = (SELECT id FROM auth.users WHERE auth.users.email = simple_users.email)
-- WHERE auth_user_id IS NULL;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id ON simple_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_simple_users_role ON simple_users(role);
CREATE INDEX IF NOT EXISTS idx_simple_users_team_id ON simple_users(team_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_user ON scenario_assignments(assigned_to_user);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_team ON scenario_assignments(assigned_to_team);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- 11. Enable RLS on new tables
ALTER TABLE scenario_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their own assignments" ON scenario_assignments
FOR SELECT USING (assigned_to_user = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own assignments" ON scenario_assignments
FOR UPDATE USING (assigned_to_user = auth.uid());

CREATE POLICY IF NOT EXISTS "Managers can create assignments" ON scenario_assignments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM simple_users 
    WHERE simple_users.auth_user_id = auth.uid() 
    AND simple_users.role IN ('manager', 'admin')
  )
);

CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications
FOR SELECT USING (
  recipient_id IN (
    SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON notifications
FOR UPDATE USING (
  recipient_id IN (
    SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
  )
);

-- 13. Final check - show current state
SELECT 
  'Final Check' as status,
  (SELECT COUNT(*) FROM simple_users) as simple_users_count,
  (SELECT COUNT(*) FROM simple_users WHERE auth_user_id IS NOT NULL) as users_with_auth_id,
  (SELECT COUNT(*) FROM simple_users WHERE role IS NOT NULL) as users_with_role,
  (SELECT COUNT(*) FROM scenario_assignments) as assignments_count,
  (SELECT COUNT(*) FROM scenarios) as scenarios_count; 