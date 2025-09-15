-- Add scenario_assignment_id field to calls table for tracking assignment completions
-- This allows us to link saved calls back to their originating assignments

-- Add the assignment tracking column
ALTER TABLE calls 
ADD COLUMN scenario_assignment_id UUID REFERENCES scenario_assignments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calls_scenario_assignment_id 
ON calls(scenario_assignment_id);

-- Add comment for documentation
COMMENT ON COLUMN calls.scenario_assignment_id IS 'Links call to originating scenario assignment for completion tracking';

-- Update RLS policies to ensure users can only see their own assignment-linked calls
-- (This should already be covered by existing policies but adding for completeness)

-- Allow users to see calls linked to their assignments
CREATE POLICY "Users can view calls from their assignments" ON calls
  FOR SELECT USING (
    scenario_assignment_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM scenario_assignments sa
      WHERE sa.id = calls.scenario_assignment_id 
      AND (sa.assigned_to_user::text = auth.uid()::text OR
           EXISTS (
             SELECT 1 FROM simple_users su 
             WHERE su.auth_user_id = auth.uid() 
             AND su.id = sa.assigned_to_user
           ))
    )
  );

-- Allow managers to see calls from assignments they created
CREATE POLICY "Managers can view calls from assignments they created" ON calls
  FOR SELECT USING (
    scenario_assignment_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM scenario_assignments sa
      JOIN simple_users su ON su.id = sa.assigned_by
      WHERE sa.id = calls.scenario_assignment_id 
      AND su.auth_user_id = auth.uid()
    )
  );