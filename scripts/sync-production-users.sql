-- Sync Production Users Between auth.users and simple_users
-- Run this AFTER running fix-production-user-data.sql

-- 1. Create a function to sync users
CREATE OR REPLACE FUNCTION sync_auth_users()
RETURNS TABLE(action TEXT, email TEXT, auth_id UUID, simple_id UUID) AS $$
DECLARE
    auth_user RECORD;
    simple_user RECORD;
    result_action TEXT;
    result_email TEXT;
    result_auth_id UUID;
    result_simple_id UUID;
BEGIN
    -- Loop through all auth.users
    FOR auth_user IN 
        SELECT id, email, email_confirmed_at, created_at 
        FROM auth.users 
        ORDER BY created_at
    LOOP
        -- Check if user exists in simple_users by email
        SELECT * INTO simple_user 
        FROM simple_users 
        WHERE email = auth_user.email;
        
        IF simple_user IS NOT NULL THEN
            -- User exists, update auth_user_id if missing
            IF simple_user.auth_user_id IS NULL THEN
                UPDATE simple_users 
                SET auth_user_id = auth_user.id,
                    email_verified = COALESCE(auth_user.email_confirmed_at IS NOT NULL, email_verified, false),
                    updated_at = NOW()
                WHERE id = simple_user.id;
                
                result_action := 'UPDATED_AUTH_ID';
                result_email := auth_user.email;
                result_auth_id := auth_user.id;
                result_simple_id := simple_user.id;
                RETURN NEXT;
            ELSE
                result_action := 'ALREADY_SYNCED';
                result_email := auth_user.email;
                result_auth_id := auth_user.id;
                result_simple_id := simple_user.id;
                RETURN NEXT;
            END IF;
        ELSE
            -- User doesn't exist in simple_users, create them
            INSERT INTO simple_users (
                auth_user_id,
                email,
                name,
                email_verified,
                subscription_status,
                password_hash,
                role,
                simulation_count,
                simulation_limit,
                created_at,
                updated_at
            ) VALUES (
                auth_user.id,
                auth_user.email,
                COALESCE(auth_user.email, 'User'),
                auth_user.email_confirmed_at IS NOT NULL,
                'free',
                'supabase_auth', -- Placeholder since we're using Supabase Auth
                'user',
                0,
                50,
                auth_user.created_at,
                NOW()
            ) RETURNING id INTO result_simple_id;
            
            result_action := 'CREATED_USER';
            result_email := auth_user.email;
            result_auth_id := auth_user.id;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 2. Run the sync function
SELECT * FROM sync_auth_users();

-- 3. Update specific user to paid status (replace with your email)
-- UPDATE simple_users 
-- SET subscription_status = 'paid',
--     role = 'admin'  -- or 'manager' if you prefer
-- WHERE email = 'your-email@domain.com';

-- 4. Check the results
SELECT 
    'Sync Results' as status,
    COUNT(*) as total_simple_users,
    COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as users_with_auth_id,
    COUNT(CASE WHEN subscription_status = 'paid' THEN 1 END) as paid_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_users
FROM simple_users;

-- 5. Show users that still need attention
SELECT 
    email,
    auth_user_id,
    subscription_status,
    role,
    email_verified
FROM simple_users 
WHERE auth_user_id IS NULL 
   OR subscription_status IS NULL 
   OR role IS NULL
ORDER BY created_at;

-- 6. Clean up the function (optional)
-- DROP FUNCTION IF EXISTS sync_auth_users(); 