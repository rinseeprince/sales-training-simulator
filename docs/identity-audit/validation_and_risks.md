# Validation and Risk Assessment

## Acceptance Tests

### Database Layer Tests

#### Test 1: Identity Mapping Completeness
```sql
-- All users should have auth_user_id mapping
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌ - ' || COUNT(*) || ' users missing auth mapping'
  END as test_result
FROM simple_users
WHERE auth_user_id IS NULL;
```

#### Test 2: Mapping Uniqueness
```sql
-- No duplicate auth_user_id values
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌ - Duplicate auth_user_ids found'
  END as test_result
FROM (
  SELECT auth_user_id, COUNT(*) 
  FROM simple_users 
  WHERE auth_user_id IS NOT NULL
  GROUP BY auth_user_id 
  HAVING COUNT(*) > 1
) duplicates;
```

#### Test 3: Foreign Key Integrity
```sql
-- All FKs should point to valid users
WITH invalid_fks AS (
  SELECT 'scenarios' as table_name, COUNT(*) as invalid_count
  FROM scenarios s
  LEFT JOIN simple_users su ON s.user_id = su.id
  WHERE su.id IS NULL
  
  UNION ALL
  
  SELECT 'calls', COUNT(*)
  FROM calls c
  LEFT JOIN simple_users su ON c.rep_id = su.id
  WHERE su.id IS NULL
)
SELECT 
  CASE 
    WHEN SUM(invalid_count) = 0 THEN 'PASS ✅'
    ELSE 'FAIL ❌ - ' || SUM(invalid_count) || ' invalid foreign keys'
  END as test_result
FROM invalid_fks;
```

#### Test 4: Materialized View Freshness
```sql
-- Materialized view should match source table
SELECT 
  CASE 
    WHEN su.count = mv.count THEN 'PASS ✅'
    ELSE 'FAIL ❌ - Counts differ: ' || su.count || ' vs ' || mv.count
  END as test_result
FROM 
  (SELECT COUNT(*) as count FROM simple_users WHERE auth_user_id IS NOT NULL) su,
  (SELECT COUNT(*) as count FROM user_id_mapping) mv;
```

### API Layer Tests

#### Test 5: Identity Resolution Performance
```typescript
// Performance test for identity resolution
describe('Identity Resolution Performance', () => {
  it('should resolve identity within 50ms', async () => {
    const start = Date.now();
    const identity = await identityService.resolveIdentity(
      asAuthUserId('test-auth-id')
    );
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50);
    expect(identity).toBeDefined();
  });

  it('should handle 100 concurrent resolutions', async () => {
    const promises = Array.from({ length: 100 }, (_, i) => 
      identityService.resolveIdentity(asAuthUserId(`auth-${i}`))
    );
    
    const start = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // 1 second for 100 requests
    expect(results.filter(r => r !== null).length).toBeGreaterThan(0);
  });
});
```

#### Test 6: Cache Effectiveness
```typescript
describe('Identity Cache', () => {
  it('should hit cache on second request', async () => {
    // First request - cache miss
    const identity1 = await identityService.resolveIdentity(
      asAuthUserId('test-auth-id')
    );
    
    // Mock database call to track if it's called
    const dbSpy = jest.spyOn(supabase.from('user_id_mapping'), 'select');
    
    // Second request - should hit cache
    const identity2 = await identityService.resolveIdentity(
      asAuthUserId('test-auth-id')
    );
    
    expect(dbSpy).not.toHaveBeenCalled();
    expect(identity1).toEqual(identity2);
  });
});
```

### End-to-End Tests

#### Test 7: User Journey Test
```typescript
describe('User Identity Flow', () => {
  it('should maintain correct identity through full user journey', async () => {
    // 1. User logs in
    const { user } = await signIn('test@example.com', 'password');
    expect(user.id).toBeDefined(); // auth.users.id
    
    // 2. Load dashboard - identity should resolve
    const dashboardResponse = await fetch('/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(dashboardResponse.ok).toBe(true);
    
    // 3. Create scenario - should use correct user_id
    const scenarioResponse = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Test', prompt: 'Test prompt' })
    });
    const scenario = await scenarioResponse.json();
    
    // 4. Verify scenario has correct user_id (simple_users.id)
    const { data } = await supabase
      .from('scenarios')
      .select('user_id')
      .eq('id', scenario.id)
      .single();
    
    expect(data.user_id).toBeDefined();
    expect(data.user_id).not.toBe(user.id); // Should be different from auth.users.id
  });
});
```

## Monitoring Hooks

### Real-time Monitoring Queries

```sql
-- Create monitoring function
CREATE OR REPLACE FUNCTION monitor_identity_health()
RETURNS TABLE(
  metric_name TEXT,
  current_value NUMERIC,
  threshold NUMERIC,
  status TEXT
) AS $$
BEGIN
  -- Users without mapping
  RETURN QUERY
  SELECT 
    'unmapped_users'::TEXT,
    COUNT(*)::NUMERIC,
    0::NUMERIC,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ALERT' END
  FROM simple_users WHERE auth_user_id IS NULL;

  -- Duplicate mappings
  RETURN QUERY
  SELECT 
    'duplicate_mappings'::TEXT,
    COUNT(*)::NUMERIC,
    0::NUMERIC,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICAL' END
  FROM (
    SELECT auth_user_id, COUNT(*)
    FROM simple_users
    WHERE auth_user_id IS NOT NULL
    GROUP BY auth_user_id
    HAVING COUNT(*) > 1
  ) dups;

  -- Orphaned records
  RETURN QUERY
  SELECT 
    'orphaned_scenarios'::TEXT,
    COUNT(*)::NUMERIC,
    0::NUMERIC,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END
  FROM scenarios s
  LEFT JOIN simple_users su ON s.user_id = su.id
  WHERE su.id IS NULL;

  -- Cache staleness (if materialized view exists)
  RETURN QUERY
  SELECT 
    'cache_staleness_minutes'::TEXT,
    EXTRACT(EPOCH FROM (NOW() - pg_stat_user_tables.last_autoanalyze))/60::NUMERIC,
    10::NUMERIC, -- Alert if > 10 minutes stale
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - pg_stat_user_tables.last_autoanalyze))/60 > 10 
      THEN 'WARNING' 
      ELSE 'OK' 
    END
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = 'user_id_mapping';
END;
$$ LANGUAGE plpgsql;

-- Schedule monitoring
SELECT cron.schedule('monitor-identity-health', '*/5 * * * *', 
  'SELECT * FROM monitor_identity_health() WHERE status != ''OK'';'
);
```

### Application Metrics

```typescript
// lib/identity/metrics.ts
import { Counter, Histogram, register } from 'prom-client';

// Define metrics
const identityResolutionDuration = new Histogram({
  name: 'identity_resolution_duration_ms',
  help: 'Duration of identity resolution in milliseconds',
  labelNames: ['cache_hit', 'success'],
  buckets: [10, 25, 50, 100, 250, 500, 1000]
});

const identityResolutionErrors = new Counter({
  name: 'identity_resolution_errors_total',
  help: 'Total number of identity resolution errors',
  labelNames: ['error_type']
});

const cacheHitRate = new Counter({
  name: 'identity_cache_hits_total',
  help: 'Total number of cache hits vs misses',
  labelNames: ['hit']
});

// Export for Prometheus
register.registerMetric(identityResolutionDuration);
register.registerMetric(identityResolutionErrors);
register.registerMetric(cacheHitRate);

// Usage in service
export function trackIdentityResolution(
  duration: number,
  cacheHit: boolean,
  success: boolean
) {
  identityResolutionDuration.observe(
    { cache_hit: cacheHit.toString(), success: success.toString() },
    duration
  );
  
  if (cacheHit) {
    cacheHitRate.inc({ hit: 'true' });
  } else {
    cacheHitRate.inc({ hit: 'false' });
  }
}
```

## Known Risks

### High Risk Items 🔴

1. **Data Corruption During Migration**
   - **Risk**: Incorrect ID mappings could break user access
   - **Mitigation**: Full backup before migration, validation queries, staged rollout
   - **Detection**: Monitor 404 errors, failed auth attempts

2. **Performance Degradation**
   - **Risk**: Materialized view refresh could lock tables
   - **Mitigation**: Use CONCURRENTLY option, off-peak deployment
   - **Detection**: Monitor query latency, lock wait times

3. **Cache Invalidation Issues**
   - **Risk**: Stale cache could show wrong user data
   - **Mitigation**: TTL limits, explicit invalidation on user updates
   - **Detection**: Monitor cache staleness metrics

### Medium Risk Items 🟡

1. **Type Confusion**
   - **Risk**: Developers use wrong ID type
   - **Mitigation**: Branded types, code review, linting rules
   - **Detection**: Type errors in CI/CD

2. **Incomplete Migration**
   - **Risk**: Some code paths still use old pattern
   - **Mitigation**: Feature flags, gradual rollout, monitoring
   - **Detection**: Track deprecated endpoint usage

3. **RLS Policy Failures**
   - **Risk**: New policies might be too restrictive
   - **Mitigation**: Test in staging, keep old policies as backup
   - **Detection**: Monitor permission denied errors

### Low Risk Items 🟢

1. **Documentation Lag**
   - **Risk**: Docs don't match implementation
   - **Mitigation**: Update docs as part of PR
   - **Detection**: Developer feedback

2. **Test Coverage Gaps**
   - **Risk**: Edge cases not tested
   - **Mitigation**: Comprehensive test suite, coverage requirements
   - **Detection**: Coverage reports

## Open Questions

1. **Historical Data**
   - Q: How to handle users created before auth system migration?
   - A: Backfill script to match by email, manual review for conflicts

2. **External Integrations**
   - Q: Do any external systems use our user IDs?
   - A: Audit webhooks, APIs, exports for ID usage

3. **Session Management**
   - Q: How to handle active sessions during migration?
   - A: Grace period with both systems active, gradual migration

4. **Rollback Strategy**
   - Q: How quickly can we rollback if issues arise?
   - A: < 5 minutes with feature flags, < 30 minutes for database changes

## Assumptions

1. ✅ All current users have email addresses
2. ✅ Supabase Auth will remain the authentication provider
3. ✅ Database has sufficient resources for materialized view
4. ✅ Application can handle 10-minute cache TTL
5. ⚠️ No external systems directly query our database
6. ⚠️ User creation rate is < 100/minute (cache can handle)

## Success Metrics

### Week 1 Targets
- ✅ 100% of users have auth_user_id mapping
- ✅ Zero duplicate mappings
- ✅ Materialized view created and indexed
- ✅ < 10ms lookup time for ID resolution

### Week 2 Targets
- ✅ 50% reduction in /api/user-profile calls
- ✅ 20% improvement in API response time
- ✅ Cache hit rate > 80%
- ✅ Zero identity-related errors

### Month 1 Targets
- ✅ Complete migration to new identity system
- ✅ Deprecated endpoints removed
- ✅ Documentation fully updated
- ✅ Developer NPS score improved

## Go/No-Go Criteria

### Go Criteria ✅
- [ ] All acceptance tests passing
- [ ] Performance benchmarks met
- [ ] Rollback plan tested
- [ ] Monitoring in place
- [ ] Team trained on new system

### No-Go Criteria ❌
- [ ] Any HIGH risk items without mitigation
- [ ] > 5% of users missing mappings
- [ ] Performance regression > 10%
- [ ] Critical bugs in testing
- [ ] Incomplete rollback plan 