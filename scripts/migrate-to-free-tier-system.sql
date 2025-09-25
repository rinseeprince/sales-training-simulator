-- Migration Script: Implement Free Tier System
-- This script migrates existing users to Pro tier and sets up the new tier structure
-- 
-- New tier structure:
-- - Free: 3 simulations (subscription_status = 'free', simulation_limit = 3)
-- - Pro: 50 simulations (subscription_status = 'paid', simulation_limit = 50) 
-- - Enterprise: Unlimited (subscription_status = 'enterprise', simulation_limit = NULL or -1)

BEGIN;

-- Step 1: Add 'enterprise' to subscription_status constraint
ALTER TABLE simple_users 
DROP CONSTRAINT IF EXISTS simple_users_subscription_status_check;

ALTER TABLE simple_users 
ADD CONSTRAINT simple_users_subscription_status_check 
CHECK (subscription_status = ANY (ARRAY['free'::text, 'paid'::text, 'trial'::text, 'enterprise'::text]));

-- Step 2: Migrate existing free users to Pro tier (paid)
-- This preserves their 50 simulation limit and upgrades them
UPDATE simple_users 
SET subscription_status = 'paid',
    updated_at = NOW()
WHERE subscription_status = 'free';

-- Step 3: Update default simulation_limit for new free users
ALTER TABLE simple_users 
ALTER COLUMN simulation_limit SET DEFAULT 3;

-- Step 4: Verify the changes
DO $$
DECLARE
    migrated_users INTEGER;
    total_users INTEGER;
BEGIN
    -- Count migrated users
    SELECT COUNT(*) INTO migrated_users 
    FROM simple_users 
    WHERE subscription_status = 'paid';
    
    -- Count total users
    SELECT COUNT(*) INTO total_users 
    FROM simple_users;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- Total users: %', total_users;
    RAISE NOTICE '- Users migrated to Pro tier: %', migrated_users;
    RAISE NOTICE '- New default simulation limit for free users: 3';
END $$;

COMMIT;

-- Verification queries (run separately to check results):
-- SELECT subscription_status, COUNT(*) as count, AVG(simulation_limit) as avg_limit 
-- FROM simple_users 
-- GROUP BY subscription_status;