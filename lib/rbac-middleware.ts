import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, AuthenticatedRequest } from './supabase-auth-middleware';
import { UserRole } from './types';
import { createClient } from '@supabase/supabase-js';

export interface RBACAuthenticatedRequest extends AuthenticatedRequest {
  userRole: UserRole;
  teamId?: string;
  managerId?: string;
  isManager: boolean;
  isAdmin: boolean;
}

/**
 * Create Supabase admin client for server-side operations
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Authenticate user with RBAC
 */
export async function authenticateWithRBAC(request: NextRequest): Promise<RBACAuthenticatedRequest | null> {
  try {
    // First, perform basic authentication
    const authRequest = await authenticateUser(request);
    if (!authRequest) {
      return null;
      console.log('❌ RBAC: Authentication failed, returning null');    }

    const supabase = createSupabaseAdmin();
    
    // Get user's role and team information from simple_users table
    // Note: authRequest.user.id is already the simple_users table ID
    const { data: userProfile, error } = await supabase
      .from('simple_users')
      .select('role, team_id, manager_id')
      .eq('id', authRequest.user.id)
      .single();

    if (error) {
      console.log('❌ RBAC: Failed to fetch user role:', error);      console.error('Failed to fetch user role:', error);
      // If the role lookup fails, let's try to continue with default role
      // This handles cases where the user exists but doesn't have RBAC fields set yet
      console.log('Continuing with default role for user:', authRequest.user.id);
    }

    // Extract role information (with fallbacks for backward compatibility)
    const userRole: UserRole = userProfile?.role || 'user';
    const teamId = userProfile?.team_id;
    const managerId = userProfile?.manager_id;
    const isManager = userRole === 'manager';
    const isAdmin = userRole === 'admin';

    // Create RBAC authenticated request
    const rbacRequest = authRequest as RBACAuthenticatedRequest;
    rbacRequest.userRole = userRole;
    rbacRequest.teamId = teamId;
    rbacRequest.managerId = managerId;
    rbacRequest.isManager = isManager;
    rbacRequest.isAdmin = isAdmin;

    return rbacRequest;

  } catch (error) {
    console.error('RBAC authentication error:', error);
    return null;
      console.log('❌ RBAC: Authentication failed, returning null');  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: RBACAuthenticatedRequest, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(user.userRole);
}

/**
 * Check if user can access a specific resource
 */
export async function canAccessResource(
  user: RBACAuthenticatedRequest,
  resourceType: 'scenario' | 'simulation' | 'assignment' | 'feedback',
  resourceId: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  // Admins can access everything
  if (user.isAdmin) {
    return true;
  }

  switch (resourceType) {
    case 'scenario':
      if (action === 'read') {
        // Check if user owns the scenario or it's assigned to them
        const { data: scenario } = await supabase
          .from('scenarios')
          .select('user_id')
          .eq('id', resourceId)
          .single();

        if (scenario?.user_id === user.user.id) {
          return true;
        }

        // Check if scenario is assigned to user
        const { data: assignment } = await supabase
          .from('scenario_assignments')
          .select('id')
          .eq('scenario_id', resourceId)
          .or(`assigned_to_user.eq.${user.user.id},assigned_to_team.eq.${user.teamId}`)
          .single();

        return !!assignment || user.isManager;
      }

      if (action === 'write' || action === 'delete') {
        // Check if user owns the scenario
        const { data: scenario } = await supabase
          .from('scenarios')
          .select('user_id')
          .eq('id', resourceId)
          .single();

        return scenario?.user_id === user.user.id || user.isManager;
      }
      break;

    case 'simulation':
      if (action === 'read') {
        // Check if user owns the simulation
        const { data: simulation } = await supabase
          .from('calls')
          .select('rep_id')
          .eq('id', resourceId)
          .single();

        return simulation?.rep_id === user.user.id || user.isManager;
      }

      if (action === 'write') {
        // Users can update their own simulations, managers can update any
        const { data: simulation } = await supabase
          .from('calls')
          .select('rep_id')
          .eq('id', resourceId)
          .single();

        return simulation?.rep_id === user.user.id || user.isManager;
      }

      if (action === 'delete') {
        // Only admins can delete simulations
        return false;
      }
      break;

    case 'assignment':
      if (action === 'read') {
        // Check if assignment is for the user
        const { data: assignment } = await supabase
          .from('scenario_assignments')
          .select('assigned_to_user, assigned_to_team, assigned_by')
          .eq('id', resourceId)
          .single();

        return (
          assignment?.assigned_to_user === user.user.id ||
          assignment?.assigned_to_team === user.teamId ||
          assignment?.assigned_by === user.user.id ||
          user.isManager
        );
      }

      if (action === 'write') {
        // Users can update their own assignment status
        const { data: assignment } = await supabase
          .from('scenario_assignments')
          .select('assigned_to_user, assigned_by')
          .eq('id', resourceId)
          .single();

        return (
          assignment?.assigned_to_user === user.user.id ||
          assignment?.assigned_by === user.user.id ||
          user.isManager
        );
      }

      if (action === 'delete') {
        // Only the assigner or admins can delete assignments
        const { data: assignment } = await supabase
          .from('scenario_assignments')
          .select('assigned_by')
          .eq('id', resourceId)
          .single();

        return assignment?.assigned_by === user.user.id || user.isAdmin;
      }
      break;

    case 'feedback':
      if (action === 'read') {
        // Users can read feedback on their simulations
        const { data: feedback } = await supabase
          .from('simulation_feedback')
          .select('simulation_id')
          .eq('id', resourceId)
          .single();

        if (feedback) {
          const { data: simulation } = await supabase
            .from('calls')
            .select('rep_id')
            .eq('id', feedback.simulation_id)
            .single();

          return simulation?.rep_id === user.user.id || user.isManager;
        }
      }

      if (action === 'write' || action === 'delete') {
        // Only managers can write/delete feedback
        return user.isManager;
      }
      break;
  }

  return false;
}

/**
 * Middleware to check role requirements
 */
export function requireRole(...requiredRoles: UserRole[]) {
  return async (request: NextRequest) => {
    const user = await authenticateWithRBAC(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasRole(user, requiredRoles)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    return user;
  };
}

/**
 * Log activity for audit trail
 */
export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>,
  request?: NextRequest
) {
  try {
    const supabase = createSupabaseAdmin();
    
    const activityData = {
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: details || {},
      ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip'),
      user_agent: request?.headers.get('user-agent'),
    };

    await supabase
      .from('activity_logs')
      .insert([activityData]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
} 