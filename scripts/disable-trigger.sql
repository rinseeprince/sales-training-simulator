-- Temporarily disable the trigger to test if it's causing the 500 error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- This will prevent the trigger from running and causing the 500 error
-- We can re-enable it later once we fix the table structure

