# Data Loading After Tab Switch - Complete Fix

## Issue Description
After the performance optimizations, components were loading correctly after tab switches, but **data was not refreshing**. This created a broken state where:
- Dashboard showed old data
- User search in saved-scenarios didn't work
- Scenario builder's assign user function disappeared
- Only a page refresh would fix the issues

## Root Cause
The React Query configuration had `refetchOnWindowFocus: false` which completely prevented data refreshing when returning to the tab. This was too aggressive and broke the user experience.

## Comprehensive Fixes Applied

### 1. React Query Configuration ✅
**Changed from preventing all refetches to smart refetching:**

```typescript
// Before - Too aggressive
refetchOnWindowFocus: false, // Never refetch
refetchOnMount: false, // Never refetch
staleTime: 5 * 60 * 1000, // 5 minutes

// After - Smart refetching
refetchOnWindowFocus: true, // Allow refetch on focus
refetchOnMount: true, // Allow refetch on mount
staleTime: 30 * 1000, // 30 seconds - shorter stale time
```

### 2. Focus Manager Improvements ✅
**Enhanced debouncing and cooldown:**
- Increased cooldown to 5 seconds between focus events
- Reduced debounce time to 100ms (we have cooldown protection)
- Added visibility change cooldown
- Better logging for debugging

### 3. Dashboard Data Loading ✅
**Made loadOtherData more robust:**
```typescript
// Now uses useCallback for stability
const loadOtherData = useCallback(async () => {
  // Loads calls and simulation data
}, [user?.id])

// Added comprehensive focus refresh
useFocusRefresh('dashboard-data', async () => {
  await Promise.all([
    refreshAssignments('my'), // React Query data
    loadOtherData() // Manual data loading
  ])
}, true)
```

### 4. Scenario Builder Fix ✅
**Fixed user domain not being set after tab switches:**
```typescript
// Now watches for user changes
useEffect(() => {
  if (user?.email) {
    const domain = user.email.split('@')[1]
    setUserDomain(domain)
  }
}, [user?.email])
```

## Expected Behavior After Fixes

| Component | Before | After |
|-----------|--------|-------|
| **Dashboard** | Stale data after tab switch | Fresh data loads automatically |
| **Saved Scenarios** | User search broken | User search works consistently |
| **Scenario Builder** | Assign user disappears | Assign user always available |
| **React Query** | Never refetches | Smart refetching with 30s stale time |
| **Focus Manager** | No cooldown protection | 5-second cooldown prevents spam |

## Performance Balance

The solution balances between:
- **Data Freshness**: 30-second stale time ensures relatively fresh data
- **Performance**: 5-second focus cooldown prevents excessive API calls
- **User Experience**: Data refreshes when needed without manual refresh

## Testing Checklist

### Basic Flow
- [ ] Login and navigate to dashboard
- [ ] Switch to another browser tab for 10+ seconds
- [ ] Return to the app tab
- [ ] Dashboard data should refresh (watch console logs)

### Component-Specific Tests
- [ ] **Dashboard**: Calls and stats should update
- [ ] **Saved Scenarios**: User search should work
- [ ] **Scenario Builder**: Assign user button should be visible
- [ ] **Assignments**: Should refresh after tab switch

### Console Logs to Expect
```
🎯 FocusManager: Focus event triggered, debouncing...
🎯 FocusManager: Executing 1 subscribers...
🎯 Dashboard: Refreshing all data on focus...
🔄 Fetching scenario assignments: my
🔄 Dashboard: Loading calls and simulation data...
✅ Dashboard: Loaded X calls
✅ Scenario assignments loaded: X
```

## Files Modified
- `components/query-provider.tsx` - Smart refetch configuration
- `lib/focus-manager.ts` - Enhanced cooldown and debouncing
- `components/pages/dashboard.tsx` - Comprehensive data refresh
- `components/pages/scenario-builder.tsx` - Fixed user domain persistence

## Key Insights

1. **Don't disable refetchOnWindowFocus entirely** - Use stale time instead
2. **Combine React Query with manual fetching** for comprehensive refresh
3. **User domain/role must persist** across component lifecycle
4. **Balance freshness vs performance** with appropriate timeouts

The tab switching experience should now be smooth with automatic data refreshing! 