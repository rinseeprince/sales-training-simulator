-- Fix Calls Table for Fresh Database
-- This script fixes the calls table foreign key to reference simple_users instead of users

-- Drop the existing foreign key constraint if it exists
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_rep_id_fkey;

-- Update the foreign key to reference simple_users
ALTER TABLE calls 
ADD CONSTRAINT calls_rep_id_fkey 
FOREIGN KEY (rep_id) REFERENCES simple_users(id) ON DELETE CASCADE;

-- Also fix scenario_id reference if needed
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_scenario_id_fkey;
ALTER TABLE calls 
ADD CONSTRAINT calls_scenario_id_fkey 
FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL;

-- Show the current calls table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;
