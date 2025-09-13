-- Create a separate table to track assignment completions
-- This avoids the problematic trigger on scenario_assignments table

CREATE TABLE IF NOT EXISTS assignment_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES scenario_assignments(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_by UUID NOT NULL REFERENCES simple_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment_id 
ON assignment_completions(assignment_id);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_assignment_completions_completed_by 
ON assignment_completions(completed_by);

-- Add RLS policies
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own completions
CREATE POLICY "Users can view their own assignment completions" ON assignment_completions
  FOR SELECT USING (
    completed_by::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = completed_by 
      AND (manager_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid()) 
           OR id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid()))
    )
  );

-- Policy for users to insert their own completions
CREATE POLICY "Users can create their own assignment completions" ON assignment_completions
  FOR INSERT WITH CHECK (completed_by::text = auth.uid()::text);

-- Policy for managers to view team completions
CREATE POLICY "Managers can view team assignment completions" ON assignment_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = completed_by 
      AND manager_id = (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
    )
  );
