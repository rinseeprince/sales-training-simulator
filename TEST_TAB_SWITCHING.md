# Tab Switching Test Plan

## 🧪 Test Procedure

### 1. Initial Load Test
1. Open browser console (F12)
2. Navigate to http://localhost:3000
3. Login with your credentials
4. Verify dashboard loads with data

### 2. Tab Switch Test - Dashboard
1. Note the current data on dashboard
2. Switch to another browser tab
3. Wait 10-15 seconds
4. Switch back to the app
5. **Expected Console Output:**
   ```
   🎯 FocusManager: Focus event triggered, debouncing...
   🎯 Dashboard: Refreshing all data on focus...
   🔄 Dashboard: Loading calls and simulation data...
   ✅ Dashboard: Loaded X calls
   ```
6. **Verify:** All dashboard data refreshes

### 3. Tab Switch Test - User Search
1. Navigate to Saved Scenarios
2. Click on a scenario to assign
3. Start typing a user name (e.g., "sa")
4. **Expected Console Output:**
   ```
   🔧 AssignmentModal: User domain set to: [yourdomain.com]
   🔍 UserSearch: Searching with domain: [yourdomain.com] query: sa
   ✅ UserSearch: Found X users
   ```
5. Switch to another tab for 10 seconds
6. Return and try searching again
7. **Verify:** User search still works

### 4. Tab Switch Test - Scenario Builder
1. Navigate to Scenario Builder
2. Check if "Assign to Users" checkbox is visible
3. Switch tabs and return
4. **Expected Console Output:**
   ```
   🔧 ScenarioBuilder: User domain set to: [yourdomain.com]
   ```
5. **Verify:** Assign functionality still works

## 🔍 What to Look For

### ✅ SUCCESS Indicators:
- Data refreshes automatically after tab switch
- User search returns results
- No "No users found" error when domain is correct
- Console shows proper domain setting
- Components don't get stuck loading

### ❌ FAILURE Indicators:
- "No user domain available" error in console
- User search shows "No users found" despite correct input
- Data doesn't refresh after tab switch
- Components stuck in loading state
- Excessive API calls (more than 2-3 per focus event)

## 📊 Performance Metrics

Monitor these in console:
1. **Focus Events:** Should see 1 focus event per tab switch
2. **API Calls:** Maximum 2-3 calls per focus event
3. **Cooldown:** No new focus events within 5 seconds
4. **Data Freshness:** Data should update within 1-2 seconds of returning to tab

## 🐛 Debug Commands

If issues persist, check these in browser console:

```javascript
// Check if user has domain
JSON.parse(localStorage.getItem('sb-auth-token')).user.email

// Check React Query cache
window.__REACT_QUERY_DEVTOOLS__.queryClient.getQueryCache().getAll()

// Check focus manager state (if exposed)
console.log(document.hasFocus())
```

## 📝 Notes

- The loading manager cache was reduced to 1 second
- React Query now allows refetch on window focus
- User domain is set from user.email on every render
- Focus manager has 5-second cooldown between events 