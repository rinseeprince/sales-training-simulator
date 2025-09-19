# Unified User System Documentation

## Overview

This application uses a **unified user ID system** where `simple_users.id` equals `auth.users.id`. This ensures consistency across the application and simplifies user management.

## Key Principles

### 1. Unified User IDs
- `simple_users.id` = `auth.users.id` (same UUID)
- No separate `auth_user_id` field needed
- Direct relationship between Supabase Auth and application users

### 2. RBAC Implementation
The system supports Role-Based Access Control with three roles:
- **admin** - Full system access
- **manager** - Team management capabilities
- **user** - Standard user access

Roles are stored in `simple_users.role` column.

## Database Structure

### Core User Table
```sql
simple_users
├── id (UUID) - Same as auth.users.id
├── email (TEXT) - User email
├── name (TEXT) - Display name
├── role (TEXT) - user/manager/admin
├── team_id (UUID) - Team association
├── manager_id (UUID) - Direct manager
└── Other user fields...
```

### Key Relationships
- **Scenarios** → owned by `simple_users.id`
- **Calls** → created by `simple_users.id` (rep_id)
- **Teams** → managed by `simple_users.id` (manager_id)
- **Notifications** → sent to `simple_users.id`
- **Activity Logs** → tracked by `simple_users.id`

## Authentication Flow

1. User signs up via Supabase Auth
2. `auth.users` record created with UUID
3. `simple_users` record created with **same UUID**
4. All application tables reference `simple_users.id`

## RBAC Features (Ready for Implementation)

### Admin Capabilities
- View all users and teams
- Manage system settings
- Access all scenarios and calls
- Generate company-wide reports

### Manager Capabilities
- View team members
- Assign scenarios to team
- Review team simulations
- Approve/reject completions
- Access team analytics

### User Capabilities
- Create personal scenarios
- Complete assigned scenarios
- View own simulations
- Access personal analytics

## Migration Scripts

### Active Scripts
- `scripts/supabase-auth-migration.sql` - Core auth setup
- `scripts/simple-auth-schema.sql` - User table structure
- `scripts/add-simulation-limits.sql` - Usage limits
- `scripts/fix-scenarios-prompt-only.sql` - Scenario structure

### Removed (Conflicting) Scripts
The following scripts have been removed as they conflicted with the unified system:
- All `fix-user-sync-*.sql` scripts
- `enhanced-auth-schema.sql`
- `setup-database.sql`
- Complex auth migration guides

## Best Practices

1. **Always use `simple_users.id`** when referencing users
2. **Check role permissions** in application logic
3. **Use RLS policies** for database-level security
4. **Maintain UUID consistency** between auth and simple_users

## Future RBAC Implementation

When implementing RBAC features:

1. **Frontend Routes**
   - Add role-based route protection
   - Show/hide UI elements based on role

2. **API Endpoints**
   - Validate user role before processing
   - Return appropriate data based on permissions

3. **Database Policies**
   - Implement RLS policies for role-based access
   - Use role checks in policy definitions

## Related Files

- `lib/supabase-auth.ts` - Auth utilities
- `components/supabase-auth-provider.tsx` - Auth context
- `middleware.ts` - Route protection
- Database schema in Supabase dashboard

## Notes

- No separate `auth_users` table exists
- No complex user sync triggers needed
- Simple, unified approach for maintainability 