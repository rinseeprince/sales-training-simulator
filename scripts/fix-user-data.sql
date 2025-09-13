-- Fix user data: Set names and roles for existing users
-- This script updates users with empty names and missing roles

-- Update names for users where name is empty or null
UPDATE simple_users 
SET name = SPLIT_PART(email, '@', 1)
WHERE (name IS NULL OR name = '' OR name = 'EMPTY') 
  AND email IS NOT NULL;

-- Set role to 'user' for users who don't have a role set
UPDATE simple_users 
SET role = 'user'
WHERE role IS NULL OR role = '';

-- Set role to 'admin' for the first user (you can change this email to your admin email)
UPDATE simple_users 
SET role = 'admin'
WHERE email = 'samuel.k@taboola.com';

-- Verify the updates
SELECT id, email, name, role, email_verified 
FROM simple_users 
ORDER BY email; 