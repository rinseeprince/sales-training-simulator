# Role-Based Access Control (RBAC) Architecture Guide

## Overview

This document provides a comprehensive overview of the RBAC implementation in the Sales Training Simulator. The system supports multi-tenant SaaS architecture with three primary roles: **User**, **Manager**, and **Admin**.

## Current RBAC Implementation

### **Authentication Architecture**

#### **Dual User System**
```sql
-- Supabase auth.users (authentication only)
auth.users {
  id: UUID (primary auth identifier)
  email: TEXT
  encrypted_password: TEXT
  -- Other Supabase auth fields
}

-- Application-specific user profiles  
simple_users {
  id: UUID (application user ID)
  auth_user_id: UUID → auth.users.id
  email: TEXT
  role: TEXT ('user', 'manager', 'admin')
  name: TEXT
  -- Other business logic fields
}
```

**Why This Design?**
- ✅ **Separation of concerns**: Auth vs business logic
- ✅ **Flexibility**: Can extend user profiles without touching auth
- ✅ **Security**: Supabase handles auth complexity
- ✅ **Multi-tenant ready**: Easy to add organization fields

### **Role Definitions**

| Role | Description | Capabilities |
|------|-------------|--------------|
| **User** | End users (sales reps) | Create scenarios, make calls, complete assignments |
| **Manager** | Team managers | All User capabilities + assign scenarios, review team performance, approve calls |
| **Admin** | System administrators | All Manager capabilities + manage templates, system configuration |

### **Team Discovery Mechanism**

#### **Email Domain-Based Teams** (Current Implementation)
```typescript
// Team discovery logic
const domain = user.email.split('@')[1] // e.g., "company.com"
const teamMembers = await supabase
  .from('simple_users')
  .select('*')
  .like('email', `%@${domain}`)
```

**Benefits:**
- ✅ **Automatic team membership** - No manual assignment needed
- ✅ **Multi-tenant isolation** - Teams can't see other organizations
- ✅ **Scalable** - Works for any organization size
- ✅ **Secure** - Domain-based isolation prevents data leakage

**Limitations:**
- ❌ **Single domain per organization** - Can't handle multi-domain companies
- ❌ **No sub-teams** - All users with same domain are in one team

## Database Schema

### **Core Tables**

#### **simple_users** (User Profiles)
```sql
CREATE TABLE simple_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **scenarios** (User-created scenarios)
```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES simple_users(id),
  title TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **scenario_assignments** (Manager → User assignments)
```sql
CREATE TABLE scenario_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(id),
  assigned_by UUID REFERENCES simple_users(id),
  assigned_to_user UUID REFERENCES simple_users(id),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **assignment_completions** (Tracking completion & review)
```sql
CREATE TABLE assignment_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES scenario_assignments(id),
  call_id UUID REFERENCES calls(id),
  completed_by UUID REFERENCES simple_users(id),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'needs_improvement', 'rejected')),
  reviewer_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES simple_users(id)
);
```

#### **calls** (Simulation calls/recordings)
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID REFERENCES simple_users(id),
  scenario_id UUID REFERENCES scenarios(id),
  assignment_id UUID REFERENCES scenario_assignments(id),
  score INTEGER CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **notifications** (System notifications)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES simple_users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Row Level Security (RLS) Policies**

#### **Data Isolation Patterns**

**Pattern 1: Own Data Only**
```sql
-- Users can only see their own scenarios
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (
  user_id IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
);
```

**Pattern 2: Team Data (Manager Access)**
```sql
-- Managers can see team assignments
CREATE POLICY "Managers can view team assignments" ON scenario_assignments
FOR SELECT USING (
  -- Can see assignments they created
  assigned_by IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR
  -- Can see assignments to them
  assigned_to_user IN (SELECT id FROM simple_users WHERE auth_user_id = auth.uid())
  OR
  -- Admins can see all
  EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role = 'admin')
);
```

**Pattern 3: Role-Based Creation**
```sql
-- Only managers can create assignments
CREATE POLICY "Managers can create assignments" ON scenario_assignments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM simple_users WHERE auth_user_id = auth.uid() AND role IN ('manager', 'admin'))
);
```

**Pattern 4: Email Domain Team Access** (For metrics)
```sql
-- Managers can see metrics for their email domain
CREATE POLICY "Domain-based team metrics" ON calls
FOR SELECT USING (
  rep_id IN (
    SELECT u1.id FROM simple_users u1
    JOIN simple_users u2 ON SPLIT_PART(u1.email, '@', 2) = SPLIT_PART(u2.email, '@', 2)
    WHERE u2.auth_user_id = auth.uid() AND u2.role IN ('manager', 'admin')
  )
);
```

## API Security Implementation

### **Authentication Middleware**
```typescript
// Standard auth pattern used across all APIs
export async function GET(request: NextRequest) {
  // 1. Extract token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify token with Supabase
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // 3. Get application user profile
  const { data: simpleUser } = await supabase
    .from('simple_users')
    .select('id, role, email')
    .eq('auth_user_id', user.id)
    .single()

  // 4. Check role permissions
  if (!['manager', 'admin'].includes(simpleUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // 5. Proceed with authorized logic...
}
```

### **Team Metrics Security** (Manager Dashboard)
```typescript
// Email domain-based team discovery
async function getTeamMetrics(authToken: string, timeRange: number) {
  // Get authenticated user's email
  const { data: authUser } = await supabase.auth.getUser(authToken)
  const domain = authUser.user.email.split('@')[1]
  
  // Find team members with same domain
  const { data: teamMembers } = await supabase
    .from('simple_users')
    .select('id, email, role')
    .like('email', `%@${domain}`)
  
  // Get team data (calls, assignments, etc.)
  const teamIds = teamMembers.map(m => m.id)
  // ... rest of metrics calculation
}
```

## Current Feature Implementation Status

### ✅ **Fully Implemented**

#### **Authentication System**
- [x] Supabase auth integration
- [x] Custom user profiles (`simple_users`)
- [x] Role-based authentication
- [x] Email domain team discovery

#### **Assignment Workflow**
- [x] Scenario assignment modal
- [x] Manager can assign scenarios to users
- [x] Assignment completion tracking
- [x] Review workflow (pending → approved/rejected)

#### **Manager Dashboard**
- [x] Team metrics calculation
- [x] Email domain-based team discovery
- [x] Performance metrics (avg score, completion rate)
- [x] Pending reviews queue
- [x] Approved calls tracking

#### **Notification System**
- [x] Database schema for notifications
- [x] Automatic notification triggers
- [x] Notification bell UI component
- [x] Real-time notification updates

#### **Row Level Security**
- [x] RLS policies for all tables
- [x] User data isolation
- [x] Manager team access
- [x] Admin full access

### 🚧 **Partially Implemented**

#### **Manager Review Interface**
- [x] Manager can see pending reviews
- [x] Basic review workflow
- [ ] Detailed call review interface
- [ ] Feedback submission form
- [ ] Review history tracking

#### **Team Management**
- [x] Email domain-based teams
- [ ] Manual team assignment
- [ ] Sub-team organization
- [ ] Team hierarchy

### ❌ **Not Implemented**

#### **Advanced RBAC Features**
- [ ] Organization-level roles
- [ ] Custom permission sets
- [ ] Role inheritance
- [ ] Multi-domain organizations

#### **Enterprise Features**
- [ ] SSO integration
- [ ] LDAP/Active Directory sync
- [ ] Audit logging
- [ ] Advanced reporting

## Scaling Considerations

### **Current Scale: 0-100 Users per Organization**

**Architecture**: Email domain-based teams ✅ **Currently Here**
- **Pros**: Simple, automatic, secure
- **Cons**: Single domain limitation
- **Performance**: Excellent for current scale

### **Growth Scale: 100-1000 Users per Organization**

**Recommended Upgrade**: Organization-based RBAC

#### **Schema Changes Needed:**
```sql
-- Add organization support
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT, -- Primary domain
  additional_domains TEXT[], -- Multiple domains
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update users table
ALTER TABLE simple_users ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Team hierarchy
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  parent_team_id UUID REFERENCES teams(id), -- Sub-teams
  name TEXT NOT NULL,
  manager_id UUID REFERENCES simple_users(id)
);

-- User team membership
CREATE TABLE team_memberships (
  user_id UUID REFERENCES simple_users(id),
  team_id UUID REFERENCES teams(id),
  role TEXT DEFAULT 'member',
  PRIMARY KEY (user_id, team_id)
);
```

#### **Updated Team Discovery:**
```typescript
// Organization-based team discovery
async function getTeamMembers(userId: string) {
  const { data: user } = await supabase
    .from('simple_users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  const { data: teamMembers } = await supabase
    .from('simple_users')
    .select('*')
    .eq('organization_id', user.organization_id)
    
  return teamMembers
}
```

### **Enterprise Scale: 1000+ Users per Organization**

**Recommended Architecture**: Advanced RBAC with caching

#### **Features Needed:**
- **Permission Caching**: Redis/memory cache for role lookups
- **Database Optimization**: Materialized views for metrics
- **Audit Logging**: Track all permission changes
- **SSO Integration**: Enterprise identity providers
- **Advanced Reporting**: Custom dashboards and analytics

## Migration Strategies

### **Phase 1: Current → Organization-based** (Recommended Next)

#### **Migration Steps:**
1. **Add organization tables** (backwards compatible)
2. **Migrate existing users** to auto-created organizations
3. **Update team discovery** to use organizations
4. **Maintain email domain fallback** for existing users
5. **Add multi-domain support** for new organizations

#### **Migration Script:**
```sql
-- 1. Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_domain TEXT,
  additional_domains TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Auto-create organizations from existing email domains
INSERT INTO organizations (name, primary_domain)
SELECT DISTINCT 
  SPLIT_PART(email, '@', 2) as name,
  SPLIT_PART(email, '@', 2) as primary_domain
FROM simple_users;

-- 3. Update users with organization_id
ALTER TABLE simple_users ADD COLUMN organization_id UUID REFERENCES organizations(id);

UPDATE simple_users 
SET organization_id = o.id
FROM organizations o
WHERE SPLIT_PART(simple_users.email, '@', 2) = o.primary_domain;
```

### **Phase 2: Organization-based → Enterprise**

#### **Features to Add:**
- **SSO Integration**: SAML/OIDC support
- **Advanced Permissions**: Granular role definitions
- **Audit System**: Track all user actions
- **Multi-tenant Database**: Separate schemas per organization
- **Performance Optimization**: Caching layers

## Security Best Practices

### **Current Implementation**

#### **✅ What We Do Well:**
- **Token Validation**: Every API call validates Supabase JWT
- **RLS Enforcement**: Database-level security policies
- **Role Verification**: Check user roles before sensitive operations
- **Data Isolation**: Email domain prevents cross-org access
- **Principle of Least Privilege**: Users only see their data

#### **🔒 Additional Security Measures:**

##### **API Rate Limiting**
```typescript
// Add to sensitive endpoints
const rateLimiter = new Map()

export async function POST(request: NextRequest) {
  const clientIP = request.ip || 'unknown'
  const key = `${clientIP}:${endpoint}`
  
  // Implement rate limiting logic
  if (isRateLimited(key)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  
  // ... rest of endpoint
}
```

##### **Input Validation**
```typescript
import { z } from 'zod'

const assignmentSchema = z.object({
  scenarioId: z.string().uuid(),
  assignedToUsers: z.array(z.string().uuid()),
  dueDate: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Validate input
  const validation = assignmentSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  
  // ... proceed with validated data
}
```

##### **Audit Logging**
```sql
-- Track sensitive operations
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES simple_users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints Security Summary

| Endpoint | Authentication | Authorization | RLS | Notes |
|----------|----------------|---------------|-----|-------|
| `/api/scenarios` | ✅ Required | Role-based | ✅ Own data only | Users CRUD their scenarios |
| `/api/assignments` | ✅ Required | Manager+ only | ✅ Team data | Manager assigns to team |
| `/api/manager-reviews/metrics` | ✅ Required | Manager+ only | ✅ Domain-based | Team metrics calculation |
| `/api/calls` | ✅ Required | Role-based | ✅ Own + assigned | Users see own, managers see team |
| `/api/notifications` | ✅ Required | Own data only | ✅ Recipient-based | Users see own notifications |

## Troubleshooting Common Issues

### **"Permission Denied" Errors**

#### **1. Check User Role**
```sql
SELECT u.email, u.role 
FROM simple_users u 
WHERE u.auth_user_id = 'your-auth-uuid';
```

#### **2. Verify RLS Policies**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('scenarios', 'scenario_assignments', 'calls');

-- Check policy definitions
SELECT * FROM pg_policies WHERE tablename = 'scenario_assignments';
```

#### **3. Test Team Discovery**
```typescript
// Debug team member discovery
const domain = 'company.com'
const { data, error } = await supabase
  .from('simple_users')
  .select('id, email, role')
  .like('email', `%@${domain}`)

console.log('Team members found:', data, 'Error:', error)
```

### **"No Team Members Found" (Dashboard Metrics)**

#### **Common Causes:**
1. **Email domain mismatch** - Check user email domains
2. **Missing simple_users record** - Verify auth_user_id mapping
3. **Role permissions** - Ensure user has manager/admin role

#### **Debug Steps:**
```typescript
// 1. Check authenticated user
const { data: authUser } = await supabase.auth.getUser(token)
console.log('Auth user:', authUser.user.email)

// 2. Check simple_users mapping
const { data: simpleUser } = await supabase
  .from('simple_users')
  .select('*')
  .eq('auth_user_id', authUser.user.id)
  .single()
console.log('Simple user:', simpleUser)

// 3. Check team discovery
const domain = authUser.user.email.split('@')[1]
const { data: teamMembers } = await supabase
  .from('simple_users')
  .select('*')
  .like('email', `%@${domain}`)
console.log('Team members:', teamMembers)
```

## Future Roadmap

### **Short Term (Next 3 months)**
- [ ] **Organization Support**: Multi-domain organizations
- [ ] **Enhanced Manager Dashboard**: Detailed call review interface
- [ ] **Performance Optimization**: Database view for metrics
- [ ] **Audit Logging**: Track sensitive operations

### **Medium Term (3-6 months)**
- [ ] **Team Hierarchy**: Sub-teams and team management
- [ ] **Advanced Permissions**: Custom role definitions
- [ ] **SSO Integration**: SAML/OIDC support
- [ ] **Real-time Features**: WebSocket notifications

### **Long Term (6+ months)**
- [ ] **Enterprise Features**: Multi-tenant database architecture
- [ ] **Advanced Analytics**: Custom reporting dashboards
- [ ] **API Rate Limiting**: DDoS protection
- [ ] **Compliance Features**: GDPR, SOC2 support

---

**Last Updated**: December 2024  
**Next Review**: When approaching 100+ users per organization  
**Maintained By**: Engineering Team  
**Security Contact**: Security Team  

**Related Documentation:**
- [Database Schema Documentation](./DATABASE_SCHEMA_DOCUMENTATION.md)
- [Manager Review Dashboard Guide](./MANAGER_REVIEW_DASHBOARD_GUIDE.md)
- [API Authentication Guide](./API_AUTHENTICATION_GUIDE.md)