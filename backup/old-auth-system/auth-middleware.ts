import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './api-utils';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authenticateUser(req: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Get user profile with role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'rep'
    };

    return authenticatedReq;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authenticatedReq = await authenticateUser(req);
    
    if (!authenticatedReq) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(authenticatedReq);
  };
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return requireAuth(async (req: AuthenticatedRequest) => {
      if (!allowedRoles.includes(req.user!.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
}

// Role-based middleware helpers
export const requireRep = requireRole(['rep', 'manager', 'admin']);
export const requireManager = requireRole(['manager', 'admin']);
export const requireAdmin = requireRole(['admin']); 