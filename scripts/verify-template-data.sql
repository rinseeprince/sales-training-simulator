-- Verify Template Data
-- This script shows all current template data to verify names and voices are correct

SELECT 
    title,
    prospect_name,
    voice,
    category,
    difficulty,
    is_active
FROM template_scenarios 
ORDER BY created_at;