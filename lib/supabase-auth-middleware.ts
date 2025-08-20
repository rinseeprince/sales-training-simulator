import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    name?: string;
    email_verified: boolean;
    subscription_status?: string;
  };
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
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies for Supabase session
  const cookieToken = request.cookies.get('sb-access-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authenticate user for API routes
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    const accessToken = extractAccessToken(request);
    
    if (!accessToken) {
      return null;
    }

    const supabase = createSupabaseClient();
    
    // Set the access token
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });

    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user profile from simple_users table
    const { data: profile, error: profileError } = await supabase
      .from('simple_users')
      .select('id, email, name, email_verified, subscription_status')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    // Create authenticated request object
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = profile;
    authenticatedRequest.authUser = {
      id: user.id,
      email: user.email || '',
    };

    return authenticatedRequest;

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}
