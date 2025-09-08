# Simulation Count on Start Implementation

## Overview
This document describes the implementation of simulation counting that occurs when a simulation STARTS, not when it's saved. This prevents users from bypassing the free tier limit by simply not saving their calls.

## Problem Solved
Previously, simulation count only incremented when a call was saved to the database. This meant users could:
- Start unlimited simulations
- Complete the calls
- Simply not save them to avoid using their quota
- Effectively get unlimited free simulations

## Solution Implemented

### 1. New API Endpoint
Created `/api/increment-simulation/route.ts` that:
- Increments simulation count immediately when called
- Checks if user has reached their limit
- Returns remaining simulations
- Has fallback mechanisms if database function fails

### 2. Updated Live Simulation Component
Modified `/components/pages/live-simulation.tsx`:
- Calls increment API when "Start Recording" is clicked
- Blocks recording if limit is reached
- Shows toast notifications for remaining simulations
- Provides upgrade prompt when limit is hit

### 3. Database Changes
- Removed automatic trigger that incremented on call insert
- Kept manual increment function for API use
- Count now increments at simulation start, not save

## How It Works

### Flow:
1. User clicks "Start Live Simulation" in Scenario Builder
2. Scenario Builder checks limit (informational only)
3. User arrives at simulation page
4. User clicks "Start Recording" button
5. **CRITICAL: Simulation count increments HERE**
6. If limit reached, recording is blocked
7. If allowed, recording starts
8. Whether user saves or not, count has already been used

### Database Operations:
```sql
-- Remove the automatic trigger (run this)
DROP TRIGGER IF EXISTS increment_simulation_count_trigger ON calls;
DROP FUNCTION IF EXISTS auto_increment_simulation_on_call();
```

### API Call:
```javascript
// Called when recording starts
const incrementResponse = await fetch('/api/increment-simulation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id })
});
```

## Benefits

1. **No Loopholes**: Users can't bypass limits by not saving
2. **Immediate Feedback**: Users know their remaining count before starting
3. **Fair Usage**: Every simulation attempt counts, saved or not
4. **Better UX**: Clear messaging about limits and remaining simulations

## User Experience

### When Starting a Simulation:
- Remaining count shown if ≤10 simulations left
- Warning shown if ≤5 simulations left
- Blocked with upgrade prompt if limit reached

### Visual Feedback:
- Toast notifications for remaining simulations
- Error messages if limit reached
- Direct link to upgrade page

## Testing

### Test Scenarios:
1. **New User**: Should get 50 simulations
2. **User at Limit**: Should be blocked from starting
3. **User Near Limit**: Should see warnings
4. **Not Saving**: Count should still increment

### Manual Testing Steps:
1. Create a free account
2. Note simulation count on dashboard
3. Start a simulation (don't save)
4. Check dashboard - count should increase
5. Repeat until limit reached
6. Verify recording is blocked at limit

## Rollback Plan

If needed to revert to save-based counting:
1. Re-create the automatic trigger
2. Remove increment call from LiveSimulation
3. Update documentation

## Future Enhancements

1. **Grace Period**: Allow 1-2 "preview" simulations after limit
2. **Partial Refund**: If simulation fails to start, refund the count
3. **Time-Based**: Limit simulations per hour/day instead of total
4. **Tiered Limits**: Different limits for different subscription levels

## Monitoring

Watch for:
- Failed increment API calls
- Users stuck at limit incorrectly
- Performance impact of extra API call
- User feedback about the new system

## Support

Common issues:
1. **"I didn't save but count went up"** - This is intentional
2. **"Simulation failed but count used"** - May need manual adjustment
3. **"Can't start any simulations"** - Check if at limit 