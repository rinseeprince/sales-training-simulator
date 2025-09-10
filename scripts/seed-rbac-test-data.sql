-- RBAC Test Data Seed Script
-- Run this after the rbac-migration.sql script

-- ============================================
-- 1. CREATE TEST USERS WITH DIFFERENT ROLES
-- ============================================

-- Note: These users need to be created via Supabase Auth first
-- Then update their roles in simple_users table

-- Example: Update existing users with roles
-- Replace these IDs with actual user IDs from your auth.users table

-- Set an admin user (replace with actual user ID)
UPDATE simple_users 
SET role = 'admin'
WHERE email = 'admin@repscore.ai' 
OR email = 'samuel.k@repscore.ai';

-- Set manager users (replace with actual user IDs)
UPDATE simple_users 
SET role = 'manager', team_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE email IN ('manager1@example.com', 'manager2@example.com');

-- Assign users to teams
UPDATE simple_users 
SET team_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE role = 'user' 
AND team_id IS NULL
LIMIT 3;

UPDATE simple_users 
SET team_id = '550e8400-e29b-41d4-a716-446655440002'
WHERE role = 'user' 
AND team_id IS NULL
LIMIT 3;

-- ============================================
-- 2. CREATE SAMPLE SCENARIOS
-- ============================================

-- Company-generated scenarios (created by admin/manager)
INSERT INTO scenarios (id, user_id, title, prompt, is_company_generated, created_by, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1),
  'Enterprise Software Sales - Discovery Call',
  'You are calling the CTO of a Fortune 500 company to discuss their current software infrastructure challenges. They have expressed interest in modernizing their tech stack but are concerned about migration costs and disruption to operations.',
  true,
  (SELECT id FROM simple_users WHERE role = 'admin' LIMIT 1),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM scenarios WHERE title = 'Enterprise Software Sales - Discovery Call'
);

INSERT INTO scenarios (id, user_id, title, prompt, is_company_generated, created_by, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  'Objection Handling - Budget Concerns',
  'The prospect loves your product but says they don''t have budget this quarter. Practice overcoming budget objections while maintaining rapport.',
  true,
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM scenarios WHERE title = 'Objection Handling - Budget Concerns'
);

INSERT INTO scenarios (id, user_id, title, prompt, is_company_generated, created_by, created_at)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  'Cold Call - SMB Outreach',
  'You are cold calling a small business owner to introduce your productivity software. They are busy and initially skeptical.',
  true,
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM scenarios WHERE title = 'Cold Call - SMB Outreach'
);

-- ============================================
-- 3. CREATE SCENARIO ASSIGNMENTS
-- ============================================

-- Assign scenarios to individual users
INSERT INTO scenario_assignments (
  scenario_id, 
  assigned_by, 
  assigned_to_user, 
  deadline, 
  status,
  created_at
)
SELECT 
  s.id,
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  u.id,
  NOW() + INTERVAL '7 days',
  'not_started',
  NOW()
FROM scenarios s
CROSS JOIN (
  SELECT id FROM simple_users WHERE role = 'user' LIMIT 2
) u
WHERE s.is_company_generated = true
AND NOT EXISTS (
  SELECT 1 FROM scenario_assignments 
  WHERE scenario_id = s.id AND assigned_to_user = u.id
)
LIMIT 4;

-- Assign a scenario to a team
INSERT INTO scenario_assignments (
  scenario_id, 
  assigned_by, 
  assigned_to_team, 
  deadline, 
  status,
  created_at
)
SELECT 
  (SELECT id FROM scenarios WHERE is_company_generated = true LIMIT 1),
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440001',
  NOW() + INTERVAL '14 days',
  'not_started',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM scenario_assignments 
  WHERE assigned_to_team = '550e8400-e29b-41d4-a716-446655440001'
  LIMIT 1
);

-- ============================================
-- 4. SIMULATE SOME COMPLETED ASSIGNMENTS
-- ============================================

-- Mark some assignments as in progress
UPDATE scenario_assignments
SET status = 'in_progress'
WHERE status = 'not_started'
AND created_at < NOW() - INTERVAL '1 day'
LIMIT 2;

-- Mark some assignments as completed with results
UPDATE scenario_assignments
SET 
  status = 'completed',
  completed_at = NOW() - INTERVAL '2 hours',
  result = 'pass',
  score = 85 + floor(random() * 15)
WHERE status = 'in_progress'
LIMIT 1;

-- Create an overdue assignment
UPDATE scenario_assignments
SET 
  deadline = NOW() - INTERVAL '1 day',
  status = 'overdue'
WHERE status = 'not_started'
LIMIT 1;

-- ============================================
-- 5. CREATE SAMPLE SIMULATIONS WITH FEEDBACK
-- ============================================

-- Add some simulations for completed assignments
INSERT INTO calls (
  rep_id,
  scenario_assignment_id,
  scenario_name,
  transcript,
  score,
  duration,
  is_company_generated,
  status,
  created_at
)
SELECT 
  sa.assigned_to_user,
  sa.id,
  s.title,
  '[{"speaker": "rep", "message": "Hello, this is a test simulation"}, {"speaker": "ai", "message": "Hi, how can I help you today?"}]'::jsonb,
  sa.score,
  180 + floor(random() * 120),
  true,
  'completed',
  sa.completed_at
FROM scenario_assignments sa
JOIN scenarios s ON sa.scenario_id = s.id
WHERE sa.status = 'completed'
AND sa.result = 'pass'
AND NOT EXISTS (
  SELECT 1 FROM calls WHERE scenario_assignment_id = sa.id
);

-- Add feedback to some simulations
INSERT INTO simulation_feedback (
  simulation_id,
  author_id,
  body,
  feedback_type,
  created_at
)
SELECT 
  c.id,
  (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  'Great job on this call! Your opening was strong and you handled the initial objections well. Consider asking more discovery questions early in the conversation.',
  'coaching',
  NOW() - INTERVAL '1 hour'
FROM calls c
WHERE c.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM simulation_feedback WHERE simulation_id = c.id
)
LIMIT 2;

-- Approve and certify some simulations
UPDATE calls
SET 
  approved = true,
  certified = true,
  reviewed_by = (SELECT id FROM simple_users WHERE role = 'manager' LIMIT 1),
  reviewed_at = NOW() - INTERVAL '30 minutes',
  status = 'reviewed'
WHERE status = 'completed'
AND score >= 90
LIMIT 1;

-- ============================================
-- 6. CREATE SAMPLE NOTIFICATIONS
-- ============================================

-- Create notifications for assigned scenarios
INSERT INTO notifications (
  recipient_id,
  type,
  entity_type,
  entity_id,
  title,
  message,
  triggered_at
)
SELECT 
  sa.assigned_to_user,
  'scenario_assigned',
  'scenario_assignment',
  sa.id,
  'New Scenario Assigned',
  'You have been assigned "' || s.title || '" - Due in 7 days',
  sa.created_at
FROM scenario_assignments sa
JOIN scenarios s ON sa.scenario_id = s.id
WHERE sa.assigned_to_user IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM notifications 
  WHERE entity_type = 'scenario_assignment' 
  AND entity_id = sa.id
)
LIMIT 3;

-- Create notifications for completed assignments
INSERT INTO notifications (
  recipient_id,
  type,
  entity_type,
  entity_id,
  title,
  message,
  triggered_at
)
SELECT 
  sa.assigned_by,
  'assignment_completed',
  'scenario_assignment',
  sa.id,
  'Assignment Completed',
  u.name || ' completed "' || s.title || '" with a ' || sa.result || ' result',
  sa.completed_at
FROM scenario_assignments sa
JOIN scenarios s ON sa.scenario_id = s.id
JOIN simple_users u ON sa.assigned_to_user = u.id
WHERE sa.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM notifications 
  WHERE entity_type = 'scenario_assignment' 
  AND entity_id = sa.id
  AND type = 'assignment_completed'
)
LIMIT 2;

-- ============================================
-- 7. SUMMARY OUTPUT
-- ============================================

-- Show summary of seeded data
DO $$
DECLARE
  admin_count INTEGER;
  manager_count INTEGER;
  user_count INTEGER;
  scenario_count INTEGER;
  assignment_count INTEGER;
  notification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM simple_users WHERE role = 'admin';
  SELECT COUNT(*) INTO manager_count FROM simple_users WHERE role = 'manager';
  SELECT COUNT(*) INTO user_count FROM simple_users WHERE role = 'user';
  SELECT COUNT(*) INTO scenario_count FROM scenarios WHERE is_company_generated = true;
  SELECT COUNT(*) INTO assignment_count FROM scenario_assignments;
  SELECT COUNT(*) INTO notification_count FROM notifications;
  
  RAISE NOTICE 'RBAC Test Data Seeded Successfully:';
  RAISE NOTICE '  Admins: %', admin_count;
  RAISE NOTICE '  Managers: %', manager_count;
  RAISE NOTICE '  Users: %', user_count;
  RAISE NOTICE '  Company Scenarios: %', scenario_count;
  RAISE NOTICE '  Assignments: %', assignment_count;
  RAISE NOTICE '  Notifications: %', notification_count;
END $$; 