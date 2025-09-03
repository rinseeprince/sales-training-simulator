-- Test if enhanced_scoring column exists and has data
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
  AND column_name = 'enhanced_scoring';

-- Check if any calls have enhanced_scoring data
SELECT 
  id, 
  scenario_name,
  score,
  enhanced_scoring IS NOT NULL as has_enhanced_scoring,
  enhanced_scoring
FROM calls 
ORDER BY created_at DESC 
LIMIT 5;
