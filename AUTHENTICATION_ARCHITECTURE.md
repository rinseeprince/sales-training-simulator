# Authentication & Organization Architecture

This document explains the authentication system and organization-aware architecture implemented in the Sales Training Simulator platform.

## Table of Contents

- [Overview](#overview)
- [Authentication System](#authentication-system)
- [Organization-Aware API Architecture](#organization-aware-api-architecture)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Implementation](#frontend-implementation)
- [Troubleshooting](#troubleshooting)
- [Migration Notes](#migration-notes)

## Overview

The platform uses a dual-layer authentication system:
1. **Supabase Auth** - Handles user authentication (sign up, sign in, sessions)
2. **Organization Middleware** - Adds organization context and role-based access control

This architecture ensures that users only see data relevant to their organization while maintaining security and scalability.

## Authentication System

### Token Management

The platform implements a **redundant token storage system** to solve Supabase client reliability issues during tab switching and page refreshes.

#### The Problem Solved
- `supabaseClient.auth.getSession()` would hang or timeout during tab switches
- Users would get stuck in loading states
- API requests would fail with "Unauthorized" errors

#### The Solution
Located in `/lib/api-client.ts`:

```typescript
// Automatic token backup when session is obtained
if (session?.access_token) {
  storeAuthToken(session.access_token, session.refresh_token);
}

// Smart token retrieval with fallbacks
export async function getAuthToken(): Promise<string | null> {
  try {
    // 1. Try stored tokens first (instant, reliable)
    const storedToken = getStoredAuthToken();
    if (storedToken) return storedToken;
    
    // 2. Try Supabase with timeout (slower, can hang)
    const result = await getSessionWithTimeout();
    
    // 3. Multiple fallback sources
  } catch (error) {
    // Emergency fallback to stored tokens
  }
}
```

#### Storage Locations
Tokens are stored redundantly in:
- `localStorage.backup_auth_token`
- `sessionStorage.backup_auth_token`
- Supabase's own storage keys
- Auto-expires after 24 hours

### User ID Mapping

The platform uses two different user ID systems:

1. **`auth.users.id`** - Supabase authentication ID
2. **`simple_users.id`** - Application user ID (with organization context)

**Mapping Flow:**
```
Supabase Auth User → simple_users table → Organization Context
     (auth_user_id)      (id, organization_id)
```

## Organization-Aware API Architecture

### Organization Middleware

Located in `/lib/organization-middleware.ts`, this middleware:
- Validates authentication tokens
- Loads user profile from `simple_users` table
- Adds organization context to all requests
- Provides role-based access control

#### Usage
```typescript
import { withOrganizationAuth } from '@/lib/organization-middleware';

export const POST = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    // req.user contains: id, email, role, organization_id
    // req.organization contains: id, name, subscription_tier, etc.
    // req.authUser contains: original Supabase auth user
  },
  {
    requiredRoles: ['admin', 'manager'], // Optional
    checkLimits: ['simulations'], // Optional
    logAction: 'CREATE_SCENARIO' // Optional
  }
);
```

### API Client

Located in `/lib/api-client.ts`, provides organization-aware API calls:

```typescript
import { api } from '@/lib/api-client';

// Automatically includes auth headers and handles organization context
const scenarios = await api.getScenarios();
const calls = await api.getCalls();
await api.saveCall(callData);
```

## Database Schema

### Key Tables

#### `simple_users`
```sql
id                 uuid PRIMARY KEY
auth_user_id       uuid REFERENCES auth.users(id)
email              text
name               text
role               text (user|manager|admin)
organization_id    uuid REFERENCES organizations(id)
email_verified     boolean
created_at         timestamp
updated_at         timestamp
```

#### `organizations`
```sql
id                          uuid PRIMARY KEY
name                        text
domain                      text
subscription_tier           text
max_users                   integer
max_simulations_per_month   integer
max_storage_mb              integer
settings                    jsonb
created_at                  timestamp
```

#### `scenarios`
```sql
id               uuid PRIMARY KEY
user_id          uuid REFERENCES simple_users(id)
organization_id  uuid REFERENCES organizations(id)
title            text
prompt           text
prospect_name    text
voice            text
created_by       uuid REFERENCES simple_users(id)
created_at       timestamp
updated_at       timestamp
```

#### `calls`
```sql
id                   uuid PRIMARY KEY
rep_id               uuid REFERENCES simple_users(id)
organization_id      uuid REFERENCES organizations(id)
scenario_name        text
scenario_prompt      text
transcript           jsonb
score                integer
enhanced_scoring     jsonb
audio_url            text
duration             integer
created_at           timestamp
```

### RLS Policies

Row Level Security policies ensure organization data isolation:

```sql
-- Users can only see their own scenarios within their organization
CREATE POLICY "scenarios_org_access" ON scenarios
  FOR SELECT USING (organization_id = get_user_organization_id());

-- Users can only see their own calls, managers see all org calls
CREATE POLICY "calls_org_access" ON calls
  FOR SELECT USING (
    CASE 
      WHEN get_user_role() = 'user' THEN rep_id = get_user_id()
      ELSE organization_id = get_user_organization_id()
    END
  );
```

## API Endpoints

### Authentication Required Endpoints

All API endpoints under organization middleware require proper authentication headers:

```typescript
// Frontend usage
const response = await fetch('/api/scenarios', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Required!
  },
  body: JSON.stringify(data)
});
```

### Endpoint Categories

#### Organization-Aware (use middleware)
- `/api/scenarios` - CRUD operations for scenarios
- `/api/calls` - Fetch calls with organization filtering
- `/api/organizations` - Organization management

#### Legacy (no middleware)
- `/api/save-call` - Saves calls with manual organization lookup
- `/api/user-profile` - User profile operations

### Call Filtering Logic

The calls API handles both new and legacy calls:

```typescript
// For users: show organization calls OR legacy calls without organization_id
if (request.user.role === 'user') {
  query = query
    .eq('rep_id', request.user.id)
    .or(`organization_id.eq.${request.organization.id},organization_id.is.null`)
} else {
  // For managers/admins: only organization calls
  query = query.eq('organization_id', request.organization.id)
}
```

## Frontend Implementation

### API Client Usage

Always use the API client for organization-aware endpoints:

```typescript
// ✅ Correct - uses API client with auth headers
import { api } from '@/lib/api-client';
const scenarios = await api.getScenarios();

// ❌ Incorrect - manual fetch without auth headers
const response = await fetch('/api/scenarios');
```

### Authentication Check

```typescript
import { useSupabaseAuth } from '@/components/supabase-auth-provider';

const { user } = useSupabaseAuth();
if (!user) {
  // Handle unauthenticated state
}
```

### Token Retrieval

```typescript
import { getAuthToken } from '@/lib/api-client';

const token = await getAuthToken();
if (!token) {
  // User needs to sign in again
}
```

## Troubleshooting

### Common Issues

#### 1. "Unauthorized" Errors
**Cause**: Missing or invalid authorization headers
**Solution**: Use the API client or manually add auth headers

#### 2. Calls Not Appearing
**Cause**: Missing `organization_id` on calls
**Solution**: Check save-call API is setting organization context

#### 3. Tab Switching Issues
**Cause**: Supabase client losing session state
**Solution**: Token backup system should handle this automatically

#### 4. User ID Mismatches
**Cause**: Mixing `auth.users.id` with `simple_users.id`
**Solution**: Always use `simple_users.id` for database operations

### Debugging

#### Check Token Storage
```javascript
// In browser console
localStorage.getItem('backup_auth_token')
sessionStorage.getItem('backup_auth_token')
```

#### Check API Logs
```typescript
// Calls API includes debug logging
console.log('Calls API: Filtering calls for user:', {
  userId: request.user.id,
  userRole: request.user.role,
  organizationId: request.organization.id
});
```

#### Check User Profile
```typescript
// Verify user has organization context
const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
const profileData = await profileResponse.json();
console.log(profileData.userProfile);
```

## Migration Notes

### From Simple Auth to Organization-Aware

When migrating existing data:

1. **Add organization_id to existing calls**:
```sql
UPDATE calls SET organization_id = (
  SELECT organization_id FROM simple_users 
  WHERE simple_users.id = calls.rep_id
) WHERE organization_id IS NULL;
```

2. **Update API endpoints** to use organization middleware

3. **Update frontend** to use API client instead of manual fetch

### Legacy Call Support

The system maintains backward compatibility:
- Legacy calls (without `organization_id`) are still accessible to their owners
- New calls automatically get organization context
- No data migration required

### Breaking Changes

- API endpoints now require authentication headers
- User IDs must use `simple_users.id` not `auth.users.id`
- Scenarios require organization context to save

## Security Considerations

1. **RLS Policies**: Ensure all tables have proper row-level security
2. **Organization Isolation**: Users can only access their organization's data
3. **Role-Based Access**: Different roles have different permissions
4. **Token Expiry**: Backup tokens expire after 24 hours
5. **Audit Logging**: All organization actions are logged

## Performance Optimizations

1. **Token Caching**: Stored tokens eliminate auth API calls
2. **Query Optimization**: Efficient organization filtering
3. **Batch Operations**: API client supports batch requests
4. **Connection Reuse**: Single Supabase client instance

---

**Last Updated**: January 2025
**Authors**: Development Team
**Related Docs**: 
- [RLS Policies](./scripts/fix-rls-complete.sql)
- [API Utils](./lib/api-utils.ts)
- [Organization Middleware](./lib/organization-middleware.ts)