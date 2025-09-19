-- Fix performance_trends table to reference simple_users instead of auth.users
-- This maintains consistency with the unified user ID system

-- Drop the existing incorrect constraint
ALTER TABLE performance_trends 
DROP CONSTRAINT IF EXISTS performance_trends_user_id_fkey;

-- Add the correct constraint referencing simple_users
ALTER TABLE performance_trends
ADD CONSTRAINT performance_trends_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES simple_users(id);

-- Add index for better query performance if not exists
CREATE INDEX IF NOT EXISTS idx_performance_trends_user_id 
ON performance_trends(user_id); 