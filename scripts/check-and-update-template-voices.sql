-- Check and Update Template Voices
-- First, let's see what we have
SELECT title, prospect_name, voice FROM template_scenarios ORDER BY created_at;

-- Then update voices if they are NULL
UPDATE template_scenarios 
SET voice = 'professional-male-us'
WHERE title = 'SaaS Cold Call - IT Director' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'casual-female-us'
WHERE title = 'Insurance Cold Call - New Parent' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'professional-female-us'
WHERE title = 'CRM Demo - Sales Manager' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'professional-male-us'
WHERE title = 'Price Objection - Budget Constraints' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'executive-female-us'
WHERE title = 'Discovery Call - HR Software' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'executive-male-us'
WHERE title = 'Close - Enterprise Software Deal' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'casual-male-us'
WHERE title = 'Real Estate - First-Time Buyer' AND voice IS NULL;

UPDATE template_scenarios 
SET voice = 'professional-female-us'
WHERE title = 'Contract Negotiation - Enterprise Deal' AND voice IS NULL;

-- Check the results
SELECT title, prospect_name, voice FROM template_scenarios ORDER BY created_at;