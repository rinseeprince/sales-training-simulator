# User Search Fix Summary

## Problem Identified
After unifying the user authentication system, the user search functionality stopped working. When searching for users (e.g., "sa" for "samuel"), no results were returned even though the user exists in the database.

## Root Causes Found

1. **Email Verification Requirement**: The search API was requiring `email_verified: true` but your user has `email_verified: false` in the database.

2. **Empty Name Field**: Your user record has an empty `name` field, which could affect name-based searches.

3. **Complex OR Query**: The Supabase query using `.or()` with multiple conditions might not be working as expected.

## Fixes Applied

### 1. Removed Email Verification Requirement
**File**: `app/api/users/search/route.ts`
- Removed `.eq('email_verified', true)` from both search formats
- Admin and manager users should be able to search all users regardless of verification status
- This aligns with the unified ID system where verification is less critical

### 2. Enhanced Name Handling
**File**: `app/api/users/search/route.ts`
- Added fallback logic: if a user has no name, use the email prefix (e.g., "samuel.k" from "samuel.k@taboola.com")
- This ensures all users are searchable even if they haven't set a display name

### 3. Added Comprehensive Logging
- Added detailed logging to track search requests and results
- This helps diagnose any remaining issues

## Database Fixes Required

Run the following SQL in your Supabase SQL Editor:

```sql
-- 1. Update empty/null names to use email prefix
UPDATE simple_users
SET 
  name = COALESCE(
    NULLIF(name, ''), 
    split_part(email, '@', 1)
  ),
  updated_at = NOW()
WHERE email LIKE '%@taboola.com%'
  AND (name IS NULL OR name = '');

-- 2. Optionally set email_verified to true for your domain
UPDATE simple_users
SET 
  email_verified = true,
  updated_at = NOW()
WHERE email LIKE '%@taboola.com%';

-- 3. Verify the updates
SELECT 
  id,
  email,
  name,
  role,
  email_verified
FROM simple_users
WHERE email LIKE '%@taboola.com%'
ORDER BY email;
```

## How User Search Works Now

### Search Flow:
1. User types in the search box (e.g., "sa")
2. After 300ms debounce, API is called with:
   - `q`: search query
   - `domain`: user's email domain (e.g., "taboola.com")
3. API searches for users where:
   - Email domain matches
   - Email OR name contains the search query (case-insensitive)
4. Results are returned with proper name fallbacks

### Two Search Formats Supported:

1. **Assignment Search** (used in Scenario Builder & Saved Scenarios):
   - URL: `/api/users/search?q=QUERY&domain=DOMAIN`
   - Searches within the specified domain
   - No email verification required

2. **Rep Filtering** (used in Simulations page):
   - URL: `/api/users/search?currentUserEmail=EMAIL&currentUserRole=ROLE`
   - Returns all users in the same domain
   - Filters out the current user
   - Requires admin/manager role

## Testing the Fix

1. **Clear browser cache and refresh the page**
2. **Try searching for yourself**:
   - Go to Saved Scenarios
   - Click on a scenario's "Assign to Users" button
   - Type "sa" or "samuel" in the search box
   - You should now see your user appear

3. **Check the console logs** for:
   - `🔍 User search API called with params:`
   - `🔍 User search request:`
   - `🔍 Found X users matching query`

## Why This Happened

The unified ID system migration changed how users are stored:
- Previously: Separate auth and user tables with different IDs
- Now: `simple_users.id = auth.users.id` (unified)

During this migration:
- Some fields like `email_verified` and `name` weren't properly migrated
- The search API wasn't updated to handle these edge cases
- The email verification requirement was too restrictive for admin operations

## Architecture Notes

The user search system is designed to be:
- **Domain-isolated**: Users can only search within their organization
- **Role-aware**: Different search capabilities for different roles
- **Fallback-friendly**: Handles missing data gracefully
- **Performance-optimized**: Uses debouncing and caching to reduce API calls

This ensures that even with incomplete user profiles, the search functionality remains robust and usable. 