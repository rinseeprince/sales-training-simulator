-- Script to undo the assignment_completions table creation
-- This will remove the table and all its associated policies

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view their own assignment completions" ON assignment_completions;
DROP POLICY IF EXISTS "Users can create their own assignment completions" ON assignment_completions;
DROP POLICY IF EXISTS "Managers can view team assignment completions" ON assignment_completions;

-- Drop indexes
DROP INDEX IF EXISTS idx_assignment_completions_assignment_id;
DROP INDEX IF EXISTS idx_assignment_completions_completed_by;

-- Drop the table
DROP TABLE IF EXISTS assignment_completions;

-- Verify the table is gone
SELECT 'assignment_completions table successfully removed' as status;
