-- Insert test user for development
-- Run this in your Supabase SQL Editor

INSERT INTO users (id, name, email, role, department, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'samuel.k',
  'samuel.k@example.com',
  'rep',
  'Sales',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  updated_at = NOW();

-- Verify the user was created
SELECT * FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000'; 