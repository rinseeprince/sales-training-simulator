-- Safe Assignment Completion Fix
-- This script safely creates missing components without destructive operations

-- 1. Create the missing assignment_completions table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS assignment_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES scenario_assignments(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by UUID NOT NULL REFERENCES simple_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment_id 
ON assignment_completions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_completions_completed_by 
ON assignment_completions(completed_by);

-- 3. Enable RLS (safe to run multiple times)
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- 4. Check what triggers exist on scenario_assignments (informational only)
SELECT 
  schemaname, 
  tablename, 
  triggername,
  'Found trigger that might be causing issues' as note
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'scenario_assignments'
AND n.nspname = 'public'
AND NOT t.tgisinternal;

-- 5. Verify the table was created successfully
SELECT 
  'assignment_completions table exists and is ready' as status,
  count(*) as current_completions
FROM assignment_completions;