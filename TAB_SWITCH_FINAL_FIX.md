# Tab Switch Issues - Root Cause Analysis & Final Fix

## 🔍 ROOT CAUSE DISCOVERED

The issue stems from **THREE interconnected problems**:

1. **Auth Token Caching** - The API client caches auth tokens that become stale after tab switches
2. **Loading Manager Blocking** - Was preventing legitimate data refreshes (now fixed)
3. **Legacy Dual-ID Code** - Components built during dual-ID auth era still have remnants

## 🎯 The Authentication Migration Issue

### Timeline:
1. **Originally**: App had dual-ID system (auth.users.id + simple_users.id)
2. **RBAC Development**: Components were built assuming dual-ID structure
3. **Migration**: System unified to single ID (auth.users.id = simple_users.id)
4. **Problem**: Components still have legacy code patterns

### Evidence in Code:
```typescript
// Still seeing these patterns:
const actualUserId = user.id;  // Legacy from dual-ID days
// MIGRATION UPDATE comments everywhere
```

## ✅ FINAL FIX APPLIED

### 1. Auth Token Cache Clearing (Just Fixed!)
```typescript
// lib/api-client.ts
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    console.log('🔄 Window focused - clearing auth token cache');
    clearAuthTokenCache();
  });
}
```

**Why this matters**: 
- Tab switch → Stale token → API calls fail silently
- Now: Tab switch → Clear cache → Fresh token → API calls work

### 2. Loading Manager Removal (Already Fixed)
- Removed from Dashboard, Scenario Builder, User Search, Notifications
- Was blocking ALL requests after tab switches

### 3. React Query Settings (Already Fixed)
- `refetchOnWindowFocus: true`
- `staleTime: 30 seconds`
- Allows proper data refreshing

## 🧪 COMPLETE TEST PROCEDURE

### Step 1: Clear Everything
```bash
1. Close all browser tabs
2. Clear browser cache (Cmd+Shift+Delete)
3. Restart the dev server
```

### Step 2: Test Auth Token Refresh
```bash
1. Open browser console
2. Login to the app
3. Look for: "✅ Fresh auth token cached"
4. Switch tabs for 10 seconds
5. Return to app
6. Look for: "🔄 Window focused - clearing auth token cache"
7. Make any action (search user, etc.)
8. Look for: "🔄 Fetching fresh auth token..."
```

### Step 3: Test Data Loading
```bash
1. Dashboard should show: "✅ Dashboard: Loaded X calls"
2. User search should show: "✅ UserSearch: Found X users"
3. No "LoadingManager" messages
4. No "Already loading" messages
```

## 📊 Expected Console Output After Tab Switch

```
🔄 Window focused - clearing auth token cache     // NEW!
🎯 FocusManager: Focus event triggered, debouncing...
🔄 Fetching fresh auth token...                   // NEW!
✅ Fresh auth token cached                        // NEW!
🔄 Dashboard: Loading calls and simulation data...
✅ Dashboard: Loaded 3 calls
🔍 UserSearch: Making request to: /api/users/search?q=sa&domain=taboola.com
✅ UserSearch: Found 1 users
```

## 🚨 If Still Not Working

The issue might be deeper in the database layer:

### Check 1: Database User IDs
```sql
-- Run in Supabase SQL Editor
SELECT id, email, auth_user_id FROM simple_users WHERE email = 'your-email@domain.com';
```
If `auth_user_id` exists and differs from `id`, the migration wasn't complete.

### Check 2: Browser Storage
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh and login again
```

### Check 3: Supabase Session
```javascript
// Run in browser console
const { data } = await window.supabaseClient.auth.getSession();
console.log('Session:', data.session);
```

## 🎓 Key Learnings

1. **Token Caching + Tab Switches = Problems**
   - Browser tabs can have stale auth tokens
   - Must clear cache on focus events

2. **Over-Optimization Hurts**
   - Loading manager was too aggressive
   - React Query already handles caching

3. **Migration Debt**
   - Legacy code patterns from dual-ID era
   - Need to clean up "actualUserId" patterns

## 🔧 Next Steps (If Needed)

1. **Complete Cleanup**: Remove all `actualUserId` references
2. **Simplify Auth**: Remove unnecessary ID mappings
3. **Add Monitoring**: Log all API failures with details
4. **Test Production**: Ensure this works in production environment

The tab switching should now work! The auth token cache clearing on focus was the missing piece! 🚀 