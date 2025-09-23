-- Update Template Voices
-- This script adds appropriate voice mappings to existing templates
-- Run this after the templates have been created

-- Update templates with appropriate voices
UPDATE template_scenarios 
SET voice = 'professional-male-us'
WHERE title = 'SaaS Cold Call - IT Director';

UPDATE template_scenarios 
SET voice = 'casual-female-us'
WHERE title = 'Insurance Cold Call - New Parent';

UPDATE template_scenarios 
SET voice = 'professional-female-us'
WHERE title = 'CRM Demo - Sales Manager';

UPDATE template_scenarios 
SET voice = 'professional-male-us'
WHERE title = 'Price Objection - Budget Constraints';

UPDATE template_scenarios 
SET voice = 'executive-female-us'
WHERE title = 'Discovery Call - HR Software';

UPDATE template_scenarios 
SET voice = 'executive-male-us'
WHERE title = 'Close - Enterprise Software Deal';

UPDATE template_scenarios 
SET voice = 'casual-male-us'
WHERE title = 'Real Estate - First-Time Buyer';

UPDATE template_scenarios 
SET voice = 'professional-female-us'
WHERE title = 'Contract Negotiation - Enterprise Deal';