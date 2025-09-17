# Current Identity Model - Dual ID System Analysis

## Executive Summary

The application has a **dual-ID inconsistency** between Supabase Auth (`auth.users`) and the application's internal user table (`simple_users`). This creates complexity and potential bugs in identity management.

## Sources of Truth for User Identity

### 1. **Supabase Auth (`auth.users`)** - External Identity
- **ID Type**: UUID
- **Purpose**: Authentication, session management, email verification
- **Managed by**: Supabase platform
- **Example ID**: `550e8400-e29b-41d4-a716-446655440001`

### 2. **Application Table (`simple_users`)** - Internal Identity  
- **ID Type**: UUID (different from auth.users.id)
- **Purpose**: Application data relationships, user profiles, RBAC
- **Managed by**: Application code
- **Example ID**: `660f9500-f39c-52e5-b827-557788550002`

## Database Tables and User References

| Table | User Column | Type | FK Target | Notes |
|-------|------------|------|-----------|-------|
| `simple_users` | `id` | UUID (PK) | - | Internal app ID |
| `simple_users` | `auth_user_id` | UUID | `auth.users.id` | Maps to Supabase Auth |
| `scenarios` | `user_id` | UUID | `simple_users.id` | Uses internal ID |
| `calls` | `rep_id` | UUID | `simple_users.id` | Uses internal ID |
| `user_usage` | `user_id` | UUID | `simple_users.id` | Uses internal ID |
| `scenario_assignments` | `assigned_by` | UUID | `simple_users.id` | Uses internal ID |
| `scenario_assignments` | `assigned_to_user` | UUID | `simple_users.id` | Uses internal ID |
| `notifications` | `recipient_id` | UUID | `simple_users.id` | Uses internal ID |
| `teams` | `manager_id` | UUID | `simple_users.id` | Uses internal ID |

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│   auth.users    │ 1────1  │  simple_users    │
│                 │         │                  │
│ id (UUID) <PK>  │────────>│ auth_user_id     │
│ email           │         │ id (UUID) <PK>   │──┐
│ created_at      │         │ email            │  │
└─────────────────┘         │ name             │  │
                           │ role             │  │
                           └──────────────────┘  │
                                    │            │
                                    │            │
                           ┌────────▼────────┐  │
                           │    scenarios    │  │
                           │                 │  │
                           │ user_id ────────│──┘
                           │ id (UUID) <PK>  │
                           └─────────────────┘
                                    │
                           ┌────────▼────────┐
                           │     calls       │
                           │                 │
                           │ rep_id ─────────│──┘
                           │ id (UUID) <PK>  │
                           └─────────────────┘
```

## Identity Mismatches and Translation Points

### Where Mismatches Occur

1. **Frontend Context**
   - `useSupabaseAuth()` returns `user.id` = `auth.users.id` (Supabase UUID)
   - Components need `simple_users.id` for API calls
   - Translation happens via `/api/user-profile?authUserId={auth.users.id}`

2. **API Layer**
   - Middleware extracts `auth.users.id` from token
   - Must lookup `simple_users.id` via `auth_user_id` column
   - RBAC middleware does this translation in `authenticateWithRBAC()`

3. **Database Layer**
   - RLS policies use `auth.uid()` (returns `auth.users.id`)
   - Must join with `simple_users` to get internal ID
   - Some policies check both: `WHERE auth_user_id = auth.uid() OR id = auth.uid()`

### Current Translation Implementation

```typescript
// Frontend (components/pages/simulations.tsx)
const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
const actualUserId = profileData.userProfile.id; // Gets simple_users.id

// Backend (lib/supabase-auth-middleware.ts)
const { data: profile } = await supabase
  .from('simple_users')
  .select('id, email, name')
  .eq('auth_user_id', user.id)  // user.id is auth.users.id
  .single();
authenticatedRequest.user = profile; // Now has simple_users.id
```

## RLS/Trigger/View Behavior

### RLS Policies
Most policies attempt dual-check pattern:
```sql
-- Example from scenarios table
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);
```

### Triggers
- `on_auth_user_created`: Syncs `auth.users` changes to `simple_users`
- Various assignment notification triggers use `simple_users.id`

### Issues with Current Approach

1. **Performance**: Every request requires ID translation lookup
2. **Complexity**: Developers must remember which ID to use where
3. **Error-prone**: Easy to use wrong ID type, causing 404s or permission errors
4. **Inconsistent**: Some code paths try both IDs as fallback
5. **Loading loops**: Multiple API calls to resolve correct user ID

## Data Flow Example

```
1. User logs in with Supabase Auth
   └─> Creates session with auth.users.id = "abc-123"

2. Frontend calls API with auth token
   └─> Token contains auth.users.id = "abc-123"

3. API middleware validates token
   └─> Extracts auth.users.id = "abc-123"
   └─> Queries simple_users WHERE auth_user_id = "abc-123"
   └─> Gets simple_users.id = "def-456"

4. API uses simple_users.id for business logic
   └─> Queries calls WHERE rep_id = "def-456"
   
5. Frontend receives data but still has auth.users.id
   └─> Must call /api/user-profile again for next request
```

## Critical Pain Points

1. **Repeated `/api/user-profile` calls**: Every component that needs user data must translate IDs
2. **Middleware complexity**: Two-step authentication (validate token, then lookup profile)
3. **RLS policy confusion**: Policies trying to handle both ID types with OR conditions
4. **No type safety**: Both IDs are UUIDs, so TypeScript can't catch mistakes
5. **Migration debt**: Historical data may have inconsistent ID references 