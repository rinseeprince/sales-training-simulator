-- Fix Samuel's Production Database Issues
-- Run this in your Production Supabase SQL Editor

-- 1. Add missing RBAC columns to simple_users table
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS manager_id UUID;

-- 2. Create scenario_assignments table (this is missing and needed for assignments)
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

-- 3. Create notifications table (needed for assignment notifications)
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

-- 4. Create activity_logs table (needed for RBAC logging)
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

-- 5. Update Samuel to be a paid admin user
UPDATE simple_users 
SET subscription_status = 'paid',
    role = 'admin',
    simulation_limit = -1,  -- unlimited for paid users
    updated_at = NOW()
WHERE email = 'samuel.k@taboola.com';

-- 6. Update Jay to be a paid manager (optional - you can make him admin too)
UPDATE simple_users 
SET subscription_status = 'paid',
    role = 'manager',
    simulation_limit = -1,  -- unlimited for paid users
    updated_at = NOW()
WHERE email = 'jay.grant@taboola.com';

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_users_role ON simple_users(role);
CREATE INDEX IF NOT EXISTS idx_simple_users_team_id ON simple_users(team_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_user ON scenario_assignments(assigned_to_user);
CREATE INDEX IF NOT EXISTS idx_scenario_assignments_assigned_to_team ON scenario_assignments(assigned_to_team);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- 8. Enable RLS on new tables
ALTER TABLE scenario_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for scenario_assignments
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

CREATE POLICY IF NOT EXISTS "Managers can view team assignments" ON scenario_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM simple_users 
    WHERE simple_users.auth_user_id = auth.uid() 
    AND simple_users.role IN ('manager', 'admin')
  )
);

-- 10. Create RLS policies for notifications
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

-- 11. Create some test scenario assignments for Samuel
INSERT INTO scenario_assignments (
  scenario_id,
  assigned_by,
  assigned_to_user,
  status,
  deadline,
  created_at
)
SELECT 
  s.id as scenario_id,
  samuel.id as assigned_by,
  samuel.id as assigned_to_user,
  'not_started' as status,
  NOW() + INTERVAL '7 days' as deadline,
  NOW() as created_at
FROM scenarios s
CROSS JOIN (SELECT id FROM simple_users WHERE email = 'samuel.k@taboola.com') samuel
WHERE s.user_id = samuel.id
LIMIT 3;

-- 12. Verify the fix
SELECT 
  'Production Fix Results' as status,
  email,
  subscription_status,
  role,
  simulation_limit,
  (SELECT COUNT(*) FROM scenario_assignments WHERE assigned_to_user = simple_users.id) as assignments_count
FROM simple_users
WHERE email IN ('samuel.k@taboola.com', 'jay.grant@taboola.com')
ORDER BY email; 