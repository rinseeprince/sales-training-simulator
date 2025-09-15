-- Minimal Assignment Completion Fix
-- Just create the missing table without any complex queries

-- 1. Create the missing assignment_completions table
CREATE TABLE IF NOT EXISTS assignment_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES scenario_assignments(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by UUID NOT NULL REFERENCES simple_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment_id 
ON assignment_completions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_completions_completed_by 
ON assignment_completions(completed_by);

-- 3. Enable RLS
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- 4. Verify the table was created
SELECT 'assignment_completions table created successfully' as status;