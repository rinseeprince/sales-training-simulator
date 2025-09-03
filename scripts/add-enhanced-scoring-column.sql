-- Add enhanced_scoring column to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS enhanced_scoring JSONB DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_enhanced_scoring 
ON calls USING GIN (enhanced_scoring);

-- Update existing calls to have a default enhanced_scoring structure
UPDATE calls 
SET enhanced_scoring = jsonb_build_object(
    'overallScore', COALESCE(score, 0),
    'strengths', ARRAY[]::text[],
    'areasForImprovement', ARRAY[]::text[],
    'keyMoments', '[]'::jsonb,
    'coachingTips', ARRAY[]::text[],
    'scenarioFit', 50,
    'readyForRealCustomers', false
)
WHERE enhanced_scoring IS NULL;
