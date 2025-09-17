# Migration Plan - Identity System Optimization

## Phase 1: Immediate Optimizations (No Downtime)

### Step 1.1: Create Materialized View for Fast Mapping
```sql
-- Create materialized view for ID mapping
CREATE MATERIALIZED VIEW IF NOT EXISTS user_id_mapping AS
SELECT 
  su.id as app_user_id,
  su.auth_user_id,
  su.email,
  su.name,
  su.role,
  su.team_id,
  su.manager_id,
  su.subscription_status,
  su.email_verified
FROM simple_users su
WHERE su.auth_user_id IS NOT NULL;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX idx_user_mapping_auth_id ON user_id_mapping(auth_user_id);
CREATE UNIQUE INDEX idx_user_mapping_app_id ON user_id_mapping(app_user_id);
CREATE INDEX idx_user_mapping_email ON user_id_mapping(email);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_user_mapping()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_id_mapping;
END;
$$ LANGUAGE plpgsql;

-- Set up automatic refresh trigger
CREATE OR REPLACE FUNCTION trigger_refresh_user_mapping()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_user_mapping();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_mapping_on_user_change
AFTER INSERT OR UPDATE OR DELETE ON simple_users
FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_user_mapping();

-- Verification query
SELECT COUNT(*) as mapped_users,
       COUNT(DISTINCT auth_user_id) as unique_auth_ids,
       COUNT(DISTINCT app_user_id) as unique_app_ids
FROM user_id_mapping;
```

**Rollback:**
```sql
DROP MATERIALIZED VIEW IF EXISTS user_id_mapping CASCADE;
DROP FUNCTION IF EXISTS refresh_user_mapping() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_user_mapping() CASCADE;
```

### Step 1.2: Add Missing Indexes and Constraints
```sql
-- Ensure auth_user_id has unique constraint
ALTER TABLE simple_users 
ADD CONSTRAINT simple_users_auth_user_id_unique 
UNIQUE (auth_user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id 
ON simple_users(auth_user_id) 
WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scenarios_user_id 
ON scenarios(user_id);

CREATE INDEX IF NOT EXISTS idx_calls_rep_id 
ON calls(rep_id);

-- Verify indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('simple_users', 'scenarios', 'calls')
ORDER BY tablename, indexname;
```

**Rollback:**
```sql
ALTER TABLE simple_users DROP CONSTRAINT IF EXISTS simple_users_auth_user_id_unique;
DROP INDEX IF EXISTS idx_simple_users_auth_user_id;
DROP INDEX IF EXISTS idx_scenarios_user_id;
DROP INDEX IF EXISTS idx_calls_rep_id;
```

### Step 1.3: Create Helper Functions for ID Translation
```sql
-- Function to get app user ID from auth user ID
CREATE OR REPLACE FUNCTION get_app_user_id(auth_id UUID)
RETURNS UUID AS $$
DECLARE
  app_id UUID;
BEGIN
  -- Try materialized view first (fastest)
  SELECT app_user_id INTO app_id
  FROM user_id_mapping
  WHERE auth_user_id = auth_id;
  
  -- Fallback to direct query if not found
  IF app_id IS NULL THEN
    SELECT id INTO app_id
    FROM simple_users
    WHERE auth_user_id = auth_id OR id = auth_id;
  END IF;
  
  RETURN app_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get auth user ID from app user ID
CREATE OR REPLACE FUNCTION get_auth_user_id(app_id UUID)
RETURNS UUID AS $$
DECLARE
  auth_id UUID;
BEGIN
  -- Try materialized view first
  SELECT auth_user_id INTO auth_id
  FROM user_id_mapping
  WHERE app_user_id = app_id;
  
  -- Fallback to direct query
  IF auth_id IS NULL THEN
    SELECT auth_user_id INTO auth_id
    FROM simple_users
    WHERE id = app_id;
  END IF;
  
  RETURN auth_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Test the functions
SELECT 
  get_app_user_id(auth_user_id) as resolved_app_id,
  get_auth_user_id(id) as resolved_auth_id,
  id as original_app_id,
  auth_user_id as original_auth_id
FROM simple_users
LIMIT 5;
```

**Rollback:**
```sql
DROP FUNCTION IF EXISTS get_app_user_id(UUID);
DROP FUNCTION IF EXISTS get_auth_user_id(UUID);
```

## Phase 2: Data Integrity Fixes

### Step 2.1: Identify and Fix Orphaned Records
```sql
-- Find users without auth_user_id mapping
SELECT id, email, name, created_at
FROM simple_users
WHERE auth_user_id IS NULL;

-- Find orphaned scenarios (user doesn't exist)
SELECT s.id, s.title, s.user_id
FROM scenarios s
LEFT JOIN simple_users su ON s.user_id = su.id
WHERE su.id IS NULL;

-- Find orphaned calls
SELECT c.id, c.scenario_name, c.rep_id
FROM calls c
LEFT JOIN simple_users su ON c.rep_id = su.id
WHERE su.id IS NULL;

-- Fix orphaned records (archive or reassign)
-- Create archive tables first
CREATE TABLE IF NOT EXISTS archived_orphaned_scenarios AS
SELECT s.*, NOW() as archived_at
FROM scenarios s
LEFT JOIN simple_users su ON s.user_id = su.id
WHERE su.id IS NULL;

CREATE TABLE IF NOT EXISTS archived_orphaned_calls AS
SELECT c.*, NOW() as archived_at
FROM calls c
LEFT JOIN simple_users su ON c.rep_id = su.id
WHERE su.id IS NULL;

-- Delete orphaned records after archiving
DELETE FROM scenarios WHERE user_id NOT IN (SELECT id FROM simple_users);
DELETE FROM calls WHERE rep_id NOT IN (SELECT id FROM simple_users);
```

### Step 2.2: Ensure All Users Have Auth Mapping
```sql
-- Sync any missing users from auth.users
INSERT INTO simple_users (
  id,
  auth_user_id,
  email,
  name,
  email_verified,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  au.email_confirmed_at IS NOT NULL,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN simple_users su ON su.auth_user_id = au.id
WHERE su.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  auth_user_id = EXCLUDED.auth_user_id,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify all users have mapping
SELECT 
  COUNT(*) as total_simple_users,
  COUNT(auth_user_id) as users_with_auth_id,
  COUNT(*) - COUNT(auth_user_id) as users_missing_auth_id
FROM simple_users;
```

## Phase 3: Update RLS Policies

### Step 3.1: Create New Optimized Policies
```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can create their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;

-- Create new policies using helper function
CREATE POLICY "scenarios_select_policy" ON scenarios
FOR SELECT USING (
  user_id = get_app_user_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users
    WHERE id = get_app_user_id(auth.uid())
    AND role IN ('manager', 'admin')
  )
);

CREATE POLICY "scenarios_insert_policy" ON scenarios
FOR INSERT WITH CHECK (
  user_id = get_app_user_id(auth.uid())
);

CREATE POLICY "scenarios_update_policy" ON scenarios
FOR UPDATE USING (
  user_id = get_app_user_id(auth.uid())
);

CREATE POLICY "scenarios_delete_policy" ON scenarios
FOR DELETE USING (
  user_id = get_app_user_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users
    WHERE id = get_app_user_id(auth.uid())
    AND role = 'admin'
  )
);

-- Similar updates for calls table
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
DROP POLICY IF EXISTS "Users can create their own calls" ON calls;

CREATE POLICY "calls_select_policy" ON calls
FOR SELECT USING (
  rep_id = get_app_user_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM simple_users
    WHERE id = get_app_user_id(auth.uid())
    AND role IN ('manager', 'admin')
  )
);

CREATE POLICY "calls_insert_policy" ON calls
FOR INSERT WITH CHECK (
  rep_id = get_app_user_id(auth.uid())
);
```

## Phase 4: Application Code Updates

### Step 4.1: Create TypeScript Types for Safety
```typescript
// lib/identity-types.ts
export type AuthUserId = string & { __brand: 'AuthUserId' };
export type AppUserId = string & { __brand: 'AppUserId' };

export interface UserIdentity {
  authUserId: AuthUserId;
  appUserId: AppUserId;
  email: string;
  role: UserRole;
}

// Type guards
export function isAuthUserId(id: string): id is AuthUserId {
  // Check if ID exists in auth.users (would need API call)
  return true; // Simplified
}

export function isAppUserId(id: string): id is AppUserId {
  // Check if ID exists in simple_users.id (would need API call)
  return true; // Simplified
}
```

### Step 4.2: Create Identity Service
```typescript
// lib/identity-service.ts
import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';

class IdentityService {
  private cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

  async getAppUserId(authUserId: string): Promise<string | null> {
    const cacheKey = `auth_to_app_${authUserId}`;
    const cached = this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const { data } = await supabase
      .from('user_id_mapping')
      .select('app_user_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (data?.app_user_id) {
      this.cache.set(cacheKey, data.app_user_id);
      return data.app_user_id;
    }
    return null;
  }

  async getAuthUserId(appUserId: string): Promise<string | null> {
    const cacheKey = `app_to_auth_${appUserId}`;
    const cached = this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const { data } = await supabase
      .from('user_id_mapping')
      .select('auth_user_id')
      .eq('app_user_id', appUserId)
      .single();

    if (data?.auth_user_id) {
      this.cache.set(cacheKey, data.auth_user_id);
      return data.auth_user_id;
    }
    return null;
  }

  invalidateCache(userId?: string) {
    if (userId) {
      this.cache.del(`auth_to_app_${userId}`);
      this.cache.del(`app_to_auth_${userId}`);
    } else {
      this.cache.flushAll();
    }
  }
}

export const identityService = new IdentityService();
```

## Phase 5: Monitoring and Validation

### Step 5.1: Create Monitoring Queries
```sql
-- Create monitoring view
CREATE OR REPLACE VIEW identity_health_check AS
SELECT 
  'total_users' as metric,
  COUNT(*) as value
FROM simple_users
UNION ALL
SELECT 
  'users_with_auth_mapping',
  COUNT(*) 
FROM simple_users WHERE auth_user_id IS NOT NULL
UNION ALL
SELECT 
  'orphaned_scenarios',
  COUNT(*)
FROM scenarios s
LEFT JOIN simple_users su ON s.user_id = su.id
WHERE su.id IS NULL
UNION ALL
SELECT 
  'orphaned_calls',
  COUNT(*)
FROM calls c
LEFT JOIN simple_users su ON c.rep_id = su.id
WHERE su.id IS NULL
UNION ALL
SELECT 
  'mapping_cache_size',
  COUNT(*)
FROM user_id_mapping;

-- Check health
SELECT * FROM identity_health_check;
```

### Step 5.2: Create Validation Procedures
```sql
-- Validate data integrity
CREATE OR REPLACE FUNCTION validate_identity_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Check 1: All simple_users have auth_user_id
  RETURN QUERY
  SELECT 
    'auth_user_id_completeness'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Users missing auth_user_id: ' || COUNT(*)::TEXT
  FROM simple_users
  WHERE auth_user_id IS NULL;

  -- Check 2: No duplicate auth_user_ids
  RETURN QUERY
  SELECT 
    'auth_user_id_uniqueness'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Duplicate auth_user_ids: ' || COUNT(*)::TEXT
  FROM (
    SELECT auth_user_id, COUNT(*) as cnt
    FROM simple_users
    WHERE auth_user_id IS NOT NULL
    GROUP BY auth_user_id
    HAVING COUNT(*) > 1
  ) dups;

  -- Check 3: All FKs are valid
  RETURN QUERY
  SELECT 
    'foreign_key_integrity'::TEXT,
    CASE 
      WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
      ELSE 'FAIL'::TEXT
    END,
    'Invalid foreign keys: ' || COUNT(*)::TEXT
  FROM (
    SELECT s.user_id FROM scenarios s
    LEFT JOIN simple_users su ON s.user_id = su.id
    WHERE su.id IS NULL
    UNION ALL
    SELECT c.rep_id FROM calls c
    LEFT JOIN simple_users su ON c.rep_id = su.id
    WHERE su.id IS NULL
  ) invalid_fks;
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_identity_integrity();
```

## Rollback Plan

### Emergency Rollback Procedure
```sql
-- 1. Restore from backup (if needed)
-- pg_restore -d your_database backup_file.sql

-- 2. Remove new objects in reverse order
DROP FUNCTION IF EXISTS validate_identity_integrity();
DROP VIEW IF EXISTS identity_health_check;
DROP POLICY IF EXISTS "scenarios_select_policy" ON scenarios;
DROP POLICY IF EXISTS "scenarios_insert_policy" ON scenarios;
DROP POLICY IF EXISTS "scenarios_update_policy" ON scenarios;
DROP POLICY IF EXISTS "scenarios_delete_policy" ON scenarios;
DROP POLICY IF EXISTS "calls_select_policy" ON calls;
DROP POLICY IF EXISTS "calls_insert_policy" ON calls;
DROP FUNCTION IF EXISTS get_app_user_id(UUID);
DROP FUNCTION IF EXISTS get_auth_user_id(UUID);
DROP MATERIALIZED VIEW IF EXISTS user_id_mapping CASCADE;
DROP FUNCTION IF EXISTS refresh_user_mapping() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_user_mapping() CASCADE;

-- 3. Restore original policies (from backup)
-- Apply original RLS policies here

-- 4. Verify system health
SELECT COUNT(*) FROM simple_users;
SELECT COUNT(*) FROM scenarios;
SELECT COUNT(*) FROM calls;
```

## Success Criteria

1. **Performance**: ID lookup queries < 10ms
2. **Accuracy**: 100% of users have valid mappings
3. **Integrity**: Zero orphaned records
4. **Availability**: Zero downtime during migration
5. **Monitoring**: All health checks passing

## Timeline

- **Day 1-2**: Deploy Phase 1 (materialized view, indexes)
- **Day 3-4**: Deploy Phase 2 (data integrity fixes)
- **Day 5-7**: Deploy Phase 3 (RLS policies)
- **Week 2**: Deploy Phase 4 (application code)
- **Week 3**: Monitor and optimize
- **Week 4**: Plan next phase of migration 