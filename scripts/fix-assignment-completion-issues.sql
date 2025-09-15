-- Fix Assignment Completion Issues
-- This script addresses the two main problems preventing assignment completion

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_completions_assignment_id 
ON assignment_completions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_completions_completed_by 
ON assignment_completions(completed_by);

-- Enable RLS
ALTER TABLE assignment_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment_completions
DROP POLICY IF EXISTS "Users can view their own assignment completions" ON assignment_completions;
CREATE POLICY "Users can view their own assignment completions" ON assignment_completions
  FOR SELECT USING (
    completed_by IN (
      SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create their own assignment completions" ON assignment_completions;
CREATE POLICY "Users can create their own assignment completions" ON assignment_completions
  FOR INSERT WITH CHECK (
    completed_by IN (
      SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Managers can view team assignment completions" ON assignment_completions;
CREATE POLICY "Managers can view team assignment completions" ON assignment_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM simple_users 
      WHERE id = completed_by 
      AND manager_id IN (
        SELECT id FROM simple_users WHERE auth_user_id = auth.uid()
      )
    )
  );

-- 2. Check for problematic triggers on scenario_assignments table
-- List all triggers on scenario_assignments to identify the issue
DO $$
BEGIN
  RAISE NOTICE 'Checking triggers on scenario_assignments table...';
  FOR rec IN 
    SELECT schemaname, tablename, triggername 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'scenario_assignments'
    AND n.nspname = 'public'
    AND NOT t.tgisinternal
  LOOP
    RAISE NOTICE 'Found trigger: % on table: %.%', rec.triggername, rec.schemaname, rec.tablename;
  END LOOP;
END $$;

-- 3. Drop any problematic triggers that might be causing the FOR loop error
-- These are common trigger names that might cause issues
DROP TRIGGER IF EXISTS update_scenario_assignments_updated_at ON scenario_assignments;
DROP TRIGGER IF EXISTS handle_updated_at ON scenario_assignments;
DROP TRIGGER IF EXISTS set_updated_at ON scenario_assignments;

-- 4. Create a safe updated_at trigger if needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create the trigger if updated_at column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scenario_assignments' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    CREATE TRIGGER update_scenario_assignments_updated_at
      BEFORE UPDATE ON scenario_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created safe updated_at trigger for scenario_assignments';
  ELSE
    RAISE NOTICE 'No updated_at column found on scenario_assignments table';
  END IF;
END $$;

-- 5. Verify the fixes
SELECT 'assignment_completions table created successfully' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'assignment_completions' 
  AND table_schema = 'public'
);

COMMIT;