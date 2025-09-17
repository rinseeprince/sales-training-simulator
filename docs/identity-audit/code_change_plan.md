# Code Change Plan - Identity System

## Overview
This document outlines the application code changes needed to support the optimized identity system.

## New Files to Create

### 1. `lib/identity/types.ts`
```typescript
// Branded types for compile-time safety
export type AuthUserId = string & { __brand: 'AuthUserId' };
export type AppUserId = string & { __brand: 'AppUserId' };

export interface UserIdentity {
  authUserId: AuthUserId;
  appUserId: AppUserId;
  email: string;
  name: string;
  role: UserRole;
  teamId?: string;
  managerId?: string;
}

// Type guards
export function asAuthUserId(id: string): AuthUserId {
  return id as AuthUserId;
}

export function asAppUserId(id: string): AppUserId {
  return id as AppUserId;
}
```

### 2. `lib/identity/service.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import { AuthUserId, AppUserId, UserIdentity } from './types';

class IdentityService {
  private static instance: IdentityService;
  private cache = new Map<string, UserIdentity>();
  private ttl = 10 * 60 * 1000; // 10 minutes
  
  static getInstance(): IdentityService {
    if (!this.instance) {
      this.instance = new IdentityService();
    }
    return this.instance;
  }

  async resolveIdentity(authUserId: AuthUserId): Promise<UserIdentity | null> {
    // Check cache first
    const cached = this.cache.get(authUserId);
    if (cached && this.isValid(cached)) {
      return cached;
    }

    // Query database
    const { data, error } = await supabase
      .from('user_id_mapping')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (data) {
      const identity: UserIdentity = {
        authUserId,
        appUserId: asAppUserId(data.app_user_id),
        email: data.email,
        name: data.name,
        role: data.role,
        teamId: data.team_id,
        managerId: data.manager_id
      };
      
      this.cache.set(authUserId, {
        ...identity,
        _timestamp: Date.now()
      });
      
      return identity;
    }
    
    return null;
  }

  private isValid(cached: any): boolean {
    return Date.now() - cached._timestamp < this.ttl;
  }

  invalidate(authUserId?: AuthUserId) {
    if (authUserId) {
      this.cache.delete(authUserId);
    } else {
      this.cache.clear();
    }
  }
}

export const identityService = IdentityService.getInstance();
```

### 3. `lib/identity/middleware.ts`
```typescript
import { NextRequest } from 'next/server';
import { identityService } from './service';
import { asAuthUserId } from './types';

export interface IdentityEnrichedRequest extends NextRequest {
  identity: UserIdentity;
}

export async function withIdentity(
  request: NextRequest,
  handler: (req: IdentityEnrichedRequest) => Promise<Response>
): Promise<Response> {
  // Extract auth user ID from token
  const authUserId = await extractAuthUserId(request);
  
  if (!authUserId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Resolve full identity
  const identity = await identityService.resolveIdentity(asAuthUserId(authUserId));
  
  if (!identity) {
    return new Response('User not found', { status: 404 });
  }

  // Attach to request
  (request as IdentityEnrichedRequest).identity = identity;
  
  return handler(request as IdentityEnrichedRequest);
}
```

### 4. `lib/identity/hooks.ts`
```typescript
import { useEffect, useState } from 'react';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { UserIdentity } from './types';
import { asAuthUserId } from './types';

export function useUserIdentity(): {
  identity: UserIdentity | null;
  loading: boolean;
  error: Error | null;
} {
  const { user } = useSupabaseAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setIdentity(null);
      setLoading(false);
      return;
    }

    const loadIdentity = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/identity/resolve?authUserId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to load identity');
        }
        
        const data = await response.json();
        setIdentity(data.identity);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadIdentity();
  }, [user?.id]);

  return { identity, loading, error };
}
```

## Files to Update

### Frontend Components

#### `components/pages/dashboard.tsx`
```typescript
// BEFORE:
const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
const actualUserId = profileData.userProfile.id;

// AFTER:
import { useUserIdentity } from '@/lib/identity/hooks';

function Dashboard() {
  const { identity, loading } = useUserIdentity();
  
  // Use identity.appUserId for API calls
  const response = await fetch(`/api/scenarios?userId=${identity.appUserId}`);
}
```

#### `components/pages/simulations.tsx`
```typescript
// BEFORE:
const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
const actualUserId = profileData.userProfile.id;

// AFTER:
const { identity } = useUserIdentity();
const response = await fetch(`/api/calls?userId=${identity.appUserId}`);
```

#### `components/pages/live-simulation.tsx`
```typescript
// BEFORE:
const profileResponse = await fetch(`/api/user-profile?authUserId=${user.id}`);
setActualUserId(profileData.userProfile.id);

// AFTER:
const { identity } = useUserIdentity();
// Use identity.appUserId directly
```

#### `components/layout/main-layout.tsx`
```typescript
// BEFORE:
const response = await fetch(`/api/user-profile?authUserId=${user.id}`);

// AFTER:
const { identity } = useUserIdentity();
// Use identity directly for avatar and profile data
```

### API Routes

#### `app/api/scenarios/route.ts`
```typescript
// BEFORE:
const authUser = await authenticateWithRBAC(req);
const userId = authUser.user.id;

// AFTER:
import { withIdentity } from '@/lib/identity/middleware';

export async function GET(req: NextRequest) {
  return withIdentity(req, async (request) => {
    const { identity } = request;
    
    const { data } = await supabase
      .from('scenarios')
      .select('*')
      .eq('user_id', identity.appUserId);
      
    return NextResponse.json({ scenarios: data });
  });
}
```

#### `app/api/calls/route.ts`
```typescript
// BEFORE:
const authUser = await authenticateWithRBAC(request);

// AFTER:
import { withIdentity } from '@/lib/identity/middleware';

export async function GET(request: NextRequest) {
  return withIdentity(request, async (req) => {
    const { identity } = req;
    
    let query = supabase
      .from('calls')
      .select('*')
      .eq('rep_id', identity.appUserId);
      
    // Role-based filtering
    if (identity.role === 'manager' || identity.role === 'admin') {
      // Can see team calls
    }
    
    return NextResponse.json(await query);
  });
}
```

#### `app/api/user-profile/route.ts`
```typescript
// This endpoint can be deprecated once identity service is in place
// Mark as deprecated and redirect to new identity endpoint
```

### Middleware Updates

#### `lib/supabase-auth-middleware.ts`
```typescript
// BEFORE:
const { data: profile } = await supabase
  .from('simple_users')
  .select('id, email, name')
  .eq('auth_user_id', user.id)
  .single();

// AFTER:
import { identityService } from '@/lib/identity/service';

const identity = await identityService.resolveIdentity(asAuthUserId(user.id));
authenticatedRequest.identity = identity;
```

#### `lib/rbac-middleware.ts`
```typescript
// BEFORE:
const { data: userProfile } = await supabase
  .from('simple_users')
  .select('role, team_id, manager_id')
  .eq('id', authRequest.user.id)
  .single();

// AFTER:
// Use identity from request
const { identity } = authRequest;
rbacRequest.userRole = identity.role;
rbacRequest.teamId = identity.teamId;
```

## Migration Strategy

### Phase 1: Add Identity Service (Week 1)
1. Deploy new identity service files
2. Create `/api/identity/resolve` endpoint
3. Add `useUserIdentity` hook
4. Deploy with feature flag disabled

### Phase 2: Update Components (Week 2)
1. Update one component at a time
2. Use feature flag to toggle between old/new
3. Monitor for errors
4. Gradually enable for more users

### Phase 3: Update API Routes (Week 3)
1. Add `withIdentity` wrapper to routes
2. Keep backward compatibility
3. Log both old and new paths
4. Compare results for accuracy

### Phase 4: Cleanup (Week 4)
1. Remove old `/api/user-profile` endpoint
2. Remove redundant identity lookups
3. Update documentation
4. Remove feature flags

## Testing Strategy

### Unit Tests
```typescript
// lib/identity/__tests__/service.test.ts
describe('IdentityService', () => {
  it('should resolve auth user ID to app user ID', async () => {
    const identity = await identityService.resolveIdentity(
      asAuthUserId('auth-123')
    );
    expect(identity?.appUserId).toBe('app-456');
  });

  it('should cache resolved identities', async () => {
    // First call hits database
    const identity1 = await identityService.resolveIdentity(
      asAuthUserId('auth-123')
    );
    
    // Second call uses cache
    const identity2 = await identityService.resolveIdentity(
      asAuthUserId('auth-123')
    );
    
    expect(identity1).toBe(identity2);
  });
});
```

### Integration Tests
```typescript
// app/api/__tests__/scenarios.test.ts
describe('Scenarios API with Identity', () => {
  it('should return scenarios for authenticated user', async () => {
    const response = await fetch('/api/scenarios', {
      headers: {
        'Authorization': `Bearer ${validToken}`
      }
    });
    
    const data = await response.json();
    expect(data.scenarios).toHaveLength(3);
    expect(data.scenarios[0].user_id).toBe('app-user-id');
  });
});
```

## Monitoring and Observability

### Metrics to Track
1. **Identity resolution time**: p50, p95, p99
2. **Cache hit rate**: Should be > 80%
3. **Failed identity lookups**: Should be < 0.1%
4. **API latency improvement**: Target 20-30% reduction

### Logging
```typescript
// Add structured logging
logger.info('Identity resolved', {
  authUserId,
  appUserId: identity.appUserId,
  cacheHit: fromCache,
  duration: Date.now() - startTime
});
```

### Error Tracking
```typescript
// Track identity resolution failures
if (!identity) {
  logger.error('Identity resolution failed', {
    authUserId,
    error: 'User not found in mapping'
  });
  
  // Send to error tracking service
  Sentry.captureException(new Error('Identity resolution failed'), {
    extra: { authUserId }
  });
}
```

## Rollback Plan

### Feature Flags
```typescript
// Use feature flags for gradual rollout
if (featureFlags.useIdentityService) {
  const { identity } = useUserIdentity();
  // New path
} else {
  // Old path with user-profile API
}
```

### Backward Compatibility
- Keep old endpoints operational during migration
- Log deprecation warnings
- Monitor usage of old vs new paths
- Only remove after 100% migration

## Success Criteria

1. ✅ All components use `useUserIdentity` hook
2. ✅ All API routes use `withIdentity` middleware
3. ✅ Zero `/api/user-profile` calls in production
4. ✅ API response time improved by 20%+
5. ✅ No increase in error rates
6. ✅ Developer satisfaction improved (survey) 