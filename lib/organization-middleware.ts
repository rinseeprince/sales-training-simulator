import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface OrganizationContext {
  id: string;
  name: string;
  domain: string;
  subscription_tier: string;
  max_users: number;
  max_simulations_per_month: number;
  max_storage_mb: number;
  settings: any;
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
    email_verified: boolean;
    organization_id: string;
    department?: string;
    team_id?: string;
  };
  organization: OrganizationContext;
  authUser: {
    id: string;
    email: string;
  };
}

/**
 * Create Supabase client for server-side operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Extract access token from request
 */
function extractAccessToken(request: NextRequest): string | null {
  // Check Authorization header first (this is what the frontend sends)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check various Supabase cookie formats
  const possibleCookieNames = [
    'sb-access-token',
    'supabase-auth-token',
    'supabase.auth.token'
  ];
  
  for (const cookieName of possibleCookieNames) {
    const cookieToken = request.cookies.get(cookieName)?.value;
    if (cookieToken) {
      return cookieToken;
    }
  }

  // Try to extract from Supabase session cookie structure
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('supabase') && cookie.name.includes('auth')) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed.access_token) {
          return parsed.access_token;
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
  }

  return null;
}

/**
 * Authenticate user and load organization context for API routes
 */
export async function authenticateWithOrganization(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    console.log(`🔐 AUTH MIDDLEWARE: Processing request to ${request.url}`);
    
    const accessToken = extractAccessToken(request);
    
    if (!accessToken) {
      console.warn('🔐 AUTH MIDDLEWARE: No access token found in request');
      // Log what cookies and headers we do have
      const allCookies = request.cookies.getAll();
      const authHeaders = request.headers.get('authorization');
      console.log('🔐 Available cookies:', allCookies.map(c => c.name));
      console.log('🔐 Auth header present:', !!authHeaders);
      return null;
    }

    console.log(`🔐 AUTH MIDDLEWARE: Token found: ${accessToken.substring(0, 20)}...`);

    const supabase = createSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.error('🔐 AUTH MIDDLEWARE: Token validation failed:', error?.message);
      return null;
    }

    console.log(`🔐 AUTH MIDDLEWARE: User validated: ${user.email}`);
    

    // Get user profile with organization info in a single optimized query
    const { data: profile, error: profileError } = await supabase
      .from('simple_users')
      .select(`
        id, 
        email, 
        name, 
        role, 
        email_verified, 
        organization_id,
        department,
        team_id,
        organizations:organization_id (
          id,
          name,
          domain,
          subscription_tier,
          max_users,
          max_simulations_per_month,
          max_storage_mb,
          settings
        )
      `)
      .eq('auth_user_id', user.id)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return null;
    }

    if (!profile.organization_id || !profile.organizations) {
      return null;
    }

    // Create authenticated request object
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      email_verified: profile.email_verified,
      organization_id: profile.organization_id,
      department: profile.department,
      team_id: profile.team_id,
    };
    
    authenticatedRequest.organization = profile.organizations as OrganizationContext;
    
    authenticatedRequest.authUser = {
      id: user.id,
      email: user.email || '',
    };

    return authenticatedRequest;

  } catch (error) {
    console.error('Organization Auth: Unexpected error:', error);
    return null;
  }
}

/**
 * Check if user has specific role
 */
export function hasRole(request: AuthenticatedRequest, roles: string[]): boolean {
  return roles.includes(request.user.role);
}

/**
 * Check if user can access resource within their organization
 */
export function canAccessOrganizationResource(
  request: AuthenticatedRequest, 
  resourceOrgId: string
): boolean {
  return request.user.organization_id === resourceOrgId;
}

/**
 * Check organization usage limits
 */
export async function checkOrganizationLimits(
  orgId: string, 
  limitType: 'users' | 'simulations' | 'storage'
): Promise<{ allowed: boolean; current: number; max: number }> {
  const supabase = createSupabaseClient();
  
  try {
    // Get organization limits
    const { data: org } = await supabase
      .from('organizations')
      .select('max_users, max_simulations_per_month, max_storage_mb')
      .eq('id', orgId)
      .single();

    if (!org) {
      return { allowed: false, current: 0, max: 0 };
    }

    let current = 0;
    let max = 0;

    switch (limitType) {
      case 'users':
        const { count: userCount } = await supabase
          .from('simple_users')
          .select('*', { count: 'exact' })
          .eq('organization_id', orgId);
        current = userCount || 0;
        max = org.max_users;
        break;

      case 'simulations':
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const { data: usage } = await supabase
          .from('organization_usage')
          .select('simulations_used')
          .eq('organization_id', orgId)
          .eq('month_year', currentMonth)
          .single();
        current = usage?.simulations_used || 0;
        max = org.max_simulations_per_month;
        break;

      case 'storage':
        const { data: storageUsage } = await supabase
          .from('organization_usage')
          .select('storage_used_mb')
          .eq('organization_id', orgId)
          .single();
        current = storageUsage?.storage_used_mb || 0;
        max = org.max_storage_mb;
        break;
    }

    return {
      allowed: current < max,
      current,
      max
    };

  } catch (error) {
    console.error('Error checking organization limits:', error);
    return { allowed: false, current: 0, max: 0 };
  }
}

/**
 * Increment organization usage counter
 */
export async function incrementOrganizationUsage(
  orgId: string,
  incrementSimulations: number = 0,
  incrementStorageMb: number = 0,
  incrementApiCalls: number = 0
): Promise<void> {
  const supabase = createSupabaseClient();
  
  try {
    const { error } = await supabase.rpc('increment_organization_usage', {
      org_id: orgId,
      increment_simulations: incrementSimulations,
      increment_storage_mb: incrementStorageMb,
      increment_api_calls: incrementApiCalls
    });

    if (error) {
      console.error('Error incrementing organization usage:', error);
    }
  } catch (error) {
    console.error('Error incrementing organization usage:', error);
  }
}

/**
 * Log audit action
 */
export async function logAuditAction(
  orgId: string,
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = createSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('audit_log')
      .insert({
        organization_id: orgId,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (error) {
      console.error('Error logging audit action:', error);
    }
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

/**
 * Get organization team members (for managers/admins)
 */
export async function getOrganizationMembers(
  request: AuthenticatedRequest
): Promise<any[]> {
  if (!hasRole(request, ['manager', 'admin'])) {
    throw new Error('Insufficient permissions');
  }

  const supabase = createSupabaseClient();
  
  const { data: members, error } = await supabase.rpc('get_organization_members', {
    org_id: request.user.organization_id
  });

  if (error) {
    console.error('Error fetching organization members:', error);
    return [];
  }

  return members || [];
}

/**
 * Middleware wrapper for API routes that require organization context
 */
export function withOrganizationAuth(
  handler: (request: AuthenticatedRequest) => Promise<Response>,
  options: {
    requiredRoles?: string[];
    checkLimits?: ('users' | 'simulations' | 'storage')[];
    logAction?: string;
  } = {}
) {
  return async (request: NextRequest): Promise<Response> => {
    // Authenticate and get organization context
    const authRequest = await authenticateWithOrganization(request);
    
    if (!authRequest) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check required roles
    if (options.requiredRoles && !hasRole(authRequest, options.requiredRoles)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check organization limits
    if (options.checkLimits) {
      for (const limitType of options.checkLimits) {
        const limit = await checkOrganizationLimits(authRequest.user.organization_id, limitType);
        if (!limit.allowed) {
          return new Response(
            JSON.stringify({ 
              error: `Organization ${limitType} limit exceeded`,
              limit: limit.max,
              current: limit.current
            }), 
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Log action if specified
    if (options.logAction) {
      await logAuditAction(
        authRequest.user.organization_id,
        authRequest.user.id,
        options.logAction,
        undefined,
        undefined,
        { endpoint: request.url },
        request.headers.get('x-forwarded-for') || 'unknown',
        request.headers.get('user-agent') || 'unknown'
      );
    }

    // Call the actual handler
    return handler(authRequest);
  };
}