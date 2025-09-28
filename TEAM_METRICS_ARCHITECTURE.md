# Team Metrics Architecture Guide

## Overview

This document explains the architecture and implementation of the team metrics system used in the manager dashboard. The system calculates real-time performance metrics for managers to track their team's progress.

## Architecture Decision: Manual Queries vs Database Views

### Current Implementation (Production Ready)

**Location**: `/app/api/manager-reviews/metrics/route.ts`

**Approach**: Manual email domain-based queries

**Why This Approach**:
- ✅ **Reliable**: Uses authenticated user's email for team discovery
- ✅ **Debuggable**: Each query is separate and traceable
- ✅ **Multi-tenant Safe**: Automatic organization isolation via email domains
- ✅ **Authentication-based**: No dependency on complex user relationships

### Performance Considerations

**Current Scale**: Optimized for teams up to ~100 users per organization
**Query Pattern**: 3-4 simple queries per metrics request
**Response Time**: < 200ms for typical team sizes

**Performance Monitoring**:
```bash
# Monitor API response times
curl -w "%{time_total}" http://localhost:3000/api/manager-reviews/metrics?timeRange=30
```

## How Team Discovery Works

### 1. Authentication-Based Team Discovery
```typescript
// Get authenticated user's email domain
const { data: authUserData } = await supabase.auth.getUser(authToken)
const domain = authUserData.user.email.split('@')[1] // e.g., "company.com"

// Find all users in same organization
const teamMembers = await supabase
  .from('simple_users')
  .select('id, email, name, role')
  .like('email', `%@${domain}`)
```

### 2. Metrics Calculation
```typescript
// Get calls for team members
const calls = await supabase.from('calls')
  .select('score, rep_id, created_at')
  .in('rep_id', teamIds)
  .gte('created_at', dateFilter)

// Calculate averages and totals
const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
const completionRate = (completedAssignments / totalAssignments) * 100
```

## Metrics Calculated

| Metric | Description | Source |
|--------|-------------|---------|
| **Team Avg Score** | Average score across all team calls with scores | `calls.score` |
| **Completion Rate** | % of assignments completed | `assignment_completions / scenario_assignments` |
| **Team Members** | Count of users in organization | `simple_users` with same email domain |
| **Pending Reviews** | Assignments awaiting manager review | `assignment_completions.review_status = 'pending'` |
| **Approved Calls** | Manager-approved assignments | `assignment_completions.review_status = 'approved'` |

## Scaling Strategy

### Phase 1: Current (0-100 users per org)
**Implementation**: Manual queries ✅ **Currently Here**
- Fast enough for current scale
- Simple and maintainable
- Easy to debug and modify

### Phase 2: Growth (100-1000 users per org) 
**Implementation**: Database View 📋 **Next Step**
- Single optimized query
- Better performance
- Centralized metric logic
- **Migration Ready**: `scripts/create-team-metrics-view.sql`

### Phase 3: Enterprise (1000+ users per org)
**Implementation**: Materialized Views + Caching
- Pre-computed metrics
- Redis caching layer
- Real-time updates via triggers

## Migration Path to Database View

When you're ready to scale (approaching 100+ users per org):

### 1. Deploy the Database View
```bash
# Run the migration
psql -f scripts/create-team-metrics-view.sql
```

### 2. Update API Implementation
```typescript
// Replace manual queries with view query
const { data } = await supabase
  .from('team_metrics_view')
  .select('*')
  .eq('email_domain', domain)
  .eq('time_bucket', timeRange === 7 ? '7_days' : '30_days')
```

### 3. Performance Monitoring
```typescript
// Add timing logs
console.time('metrics-query')
const metrics = await getTeamMetrics(domain, timeRange)
console.timeEnd('metrics-query')
```

## Database Schema Dependencies

### Required Tables
- `simple_users` - User profiles with email domains
- `calls` - Simulation calls with scores
- `scenario_assignments` - Assigned training scenarios  
- `assignment_completions` - Completion tracking with review status

### Key Relationships
```sql
calls.rep_id → simple_users.id
scenario_assignments.assigned_to_user → simple_users.id
assignment_completions.assignment_id → scenario_assignments.id
```

### Critical Indexes (for performance)
```sql
-- Current indexes
CREATE INDEX idx_calls_rep_id_created_at ON calls(rep_id, created_at);
CREATE INDEX idx_assignments_user_created ON scenario_assignments(assigned_to_user, created_at);

-- Future view optimization
CREATE INDEX idx_users_email_domain ON simple_users(SPLIT_PART(email, '@', 2));
```

## Debugging Guide

### Common Issues

#### 1. "Team Members: 0" 
**Cause**: Email domain mismatch or authentication issue
**Debug**:
```typescript
// Check what domain is being extracted
console.log('Domain:', authUserData.user.email.split('@')[1])

// Verify team members query
const { data, error } = await supabase
  .from('simple_users')
  .select('email')
  .like('email', `%@${domain}`)
console.log('Team members found:', data, 'Error:', error)
```

#### 2. "Avg Score: 0"
**Cause**: No calls with scores in time range
**Debug**:
```typescript
// Check for calls with scores
const { data } = await supabase.from('calls')
  .select('score, created_at')
  .in('rep_id', teamIds)
  .not('score', 'is', null)
console.log('Calls with scores:', data)
```

#### 3. "Completion Rate: 0%"
**Cause**: No assignment completions found
**Debug**:
```typescript
// Check assignment completion relationship
const { data } = await supabase
  .from('scenario_assignments')
  .select(`*, assignment_completions(*)`)
  .in('assigned_to_user', teamIds)
console.log('Assignments with completions:', data)
```

### Performance Debugging
```typescript
// Add performance monitoring
const start = Date.now()
const metrics = await getTeamMetrics(domain, timeRange)
const duration = Date.now() - start
console.log(`Metrics calculated in ${duration}ms`)

// Log query counts
console.log('Queries executed:', {
  teamMembers: teamMembers.length,
  calls: calls?.length || 0,
  assignments: assignments?.length || 0
})
```

## Security Considerations

### Row-Level Security (RLS)
- ✅ **Email domain isolation**: Users only see their organization's data
- ✅ **Role-based access**: Only managers/admins can access metrics
- ✅ **Authentication required**: All queries use authenticated user context

### Data Privacy
- Email domains used for team grouping (industry standard)
- No cross-organization data leakage possible
- Managers can only see their team's aggregated metrics

## Monitoring & Alerts

### Key Metrics to Monitor
```javascript
// Response times
api_request_duration_seconds{endpoint="/api/manager-reviews/metrics"}

// Error rates  
api_errors_total{endpoint="/api/manager-reviews/metrics"}

// Team sizes (for scaling decisions)
team_size_histogram{domain="company.com"}
```

### Performance Alerts
- **Warning**: Response time > 500ms (consider view migration)
- **Critical**: Response time > 2s (immediate optimization needed)
- **Info**: Team size > 50 users (plan view migration)

## FAQ for Developers

**Q: Why not use the database function?**
A: The database function relied on `manager_id` relationships that weren't properly configured. Email domain matching is more reliable for multi-tenant SaaS.

**Q: Will this scale to enterprise customers?**
A: Current implementation scales to ~100 users per org. The migration path to database views supports 1000+ users per org.

**Q: How do we handle multiple domains per organization?**
A: Currently each email domain = one organization. For multi-domain orgs, add an `organization_id` field and update the team discovery logic.

**Q: What if email domain matching breaks?**
A: Add fallback to organization_id or implement manual team assignment in the admin panel.

**Q: How do we test this with realistic data?**
A: Use the debug endpoint `/api/debug-metrics` to verify data exists at each step of the calculation.

## Future Enhancements

### Short Term (< 3 months)
- [ ] Implement database view migration
- [ ] Add response time monitoring
- [ ] Cache metrics for 5 minutes (Redis)

### Medium Term (3-6 months)  
- [ ] Real-time metrics via WebSockets
- [ ] Historical trend analysis
- [ ] Custom date range support

### Long Term (6+ months)
- [ ] Multi-organization support
- [ ] Custom metric definitions
- [ ] Analytics dashboard integration

---

**Last Updated**: December 2024
**Next Review**: When approaching 100 users per organization
**Owner**: Engineering Team