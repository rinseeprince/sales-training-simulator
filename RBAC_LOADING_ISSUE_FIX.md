# RBAC Loading Issue Fix Summary

## Problem Description
The RBAC implementation branch experienced critical loading issues where components modified for RBAC features would get stuck in infinite loading states, make duplicate API calls (4-6x), and fail to load when users switched browser tabs.

### Affected Components
- **SavedScenarios**: Stuck loading indefinitely
- **Dashboard**: Assignment cards stuck loading
- **ScenarioBuilder**: "Assign to Users" feature disappearing

### Root Causes Identified

1. **Multiple Event Listeners**: Components were adding both `focus` and `visibilitychange` event listeners that triggered API calls whenever the user switched tabs
2. **No Debouncing**: API calls were triggered immediately on every focus/visibility event without any debouncing
3. **Component Remounting**: Each page wraps itself in MainLayout, causing full component tree remounts on navigation
4. **LoadingManager Limitations**: The global LoadingManager didn't persist state across component unmounts/remounts
5. **Excessive Logging**: The api-client.ts had numerous console.log statements causing performance issues
6. **Missing Mount State Tracking**: Components didn't track if they were mounted, leading to state updates on unmounted components

## Fixes Applied

### 1. API Client Optimization (`lib/api-client.ts`)
- **Removed excessive console.log statements** that were causing performance issues
- Kept only essential error logging and retry notifications
- This reduces console noise and improves performance

### 2. LoadingManager Enhancement (`lib/loading-manager.ts`)
- **Added time-based caching** to prevent duplicate requests within 2 seconds
- **Added `isRecentlyCompleted()` method** to check if a request was recently made
- **Added `skipIfRecent` option** to `withLoading()` method
- **Track last request times** to implement intelligent request deduplication

### 3. SavedScenarios Component (`components/pages/saved-scenarios.tsx`)
- **Added mount state tracking** with `isMountedRef` and `hasFetchedInitialDataRef`
- **Implemented debouncing** with 2-second delay for focus events
- **Removed visibilitychange listener** (kept only focus listener)
- **Added useCallback** for load functions to prevent recreation
- **Separated initial data load** from refresh logic
- **Added proper cleanup** in useEffect returns

### 4. Dashboard Component (`components/pages/dashboard.tsx`)
- **Added mount state tracking** with `isMountedRef` and `lastFetchTimeRef`
- **Implemented debouncing** for focus events
- **Removed visibilitychange listener**
- **Added useCallback** for loadAssignments function
- **Protected state updates** to only occur when component is mounted

### 5. ScenarioBuilder Component (`components/pages/scenario-builder.tsx`)
- **Added initialization tracking** with `hasInitializedRef`
- **Added mount state tracking** with `isMountedRef`
- **Prevented duplicate initialization** of user role and scenarios
- **Added proper cleanup** on unmount

## Key Improvements

### Debouncing Strategy
```javascript
const DEBOUNCE_TIME = 2000; // 2 seconds
let debounceTimer: NodeJS.Timeout | null = null;

const handlePageFocus = () => {
  // Prevent refresh if we recently fetched data
  if (Date.now() - lastFetchTimeRef.current < DEBOUNCE_TIME) {
    return;
  }
  
  // Debounce the refresh
  debounceTimer = setTimeout(() => {
    // Perform refresh
  }, 500);
}
```

### Mount State Protection
```javascript
if (isMountedRef.current) {
  setState(data); // Only update state if component is still mounted
}
```

### One-time Initialization
```javascript
if (!user || hasFetchedInitialDataRef.current) return;
hasFetchedInitialDataRef.current = true;
// Perform initial data load
```

## Testing the Fixes

### What to Test
1. **Login as admin/manager** and verify all features load correctly
2. **Switch browser tabs** multiple times and return - components should not reload unnecessarily
3. **Check console logs** - should see minimal duplicate API calls
4. **Navigate between pages** - should load quickly without stuck states
5. **Check "Assign to Users"** feature in ScenarioBuilder - should remain visible

### Expected Behavior
- Components load once on mount
- Switching tabs doesn't trigger immediate reloads
- API calls are debounced and deduplicated
- No infinite loading states
- Console shows minimal duplicate requests

## Performance Metrics
- **Before**: 4-6 duplicate API calls per component
- **After**: 1 API call on mount, debounced refreshes on focus
- **Debounce time**: 2 seconds minimum between refreshes
- **Cache duration**: 2 seconds for LoadingManager

## Future Recommendations

1. **Consider moving MainLayout to a shared layout** instead of wrapping each page individually
2. **Implement a global state management solution** (Redux/Zustand) for shared data
3. **Add request caching at the API level** for frequently accessed data
4. **Consider using React Query or SWR** for better data fetching and caching
5. **Implement proper error boundaries** to catch and handle component errors gracefully

## Rollback Plan
If issues persist, you can rollback by:
1. Reverting the changes to the three modified files
2. The original behavior will return (with the loading issues)
3. Consider implementing a different architecture pattern for RBAC features 