-- Add coach_name column to scenarios table
-- This column stores the custom name for the AI coach (e.g., "Sarah", "Marcus", "Jennifer")

ALTER TABLE scenarios 
ADD COLUMN coach_name text DEFAULT 'Ivy Scenario Builder';

-- Update existing scenarios to use 'Ivy Scenario Builder' as default
UPDATE scenarios 
SET coach_name = 'Ivy Scenario Builder' 
WHERE coach_name IS NULL;