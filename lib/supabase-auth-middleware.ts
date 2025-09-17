import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side operations
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    name?: string;
    email_verified?: boolean;
    subscription_status?: string;
  };
  authUser: {
    id: string;
    email: string;
  };
}

/**
 * Extract access token from request
 */
function extractAccessToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    console.log('🔍 Token extraction: Found in Authorization header');
    return authHeader.substring(7);
  }

  // Try x-supabase-auth header
  const supabaseAuthHeader = request.headers.get('x-supabase-auth');
  if (supabaseAuthHeader) {
    console.log('🔍 Token extraction: Found in x-supabase-auth header');
    return supabaseAuthHeader;
  }

  console.log('🔍 Token extraction: Checking cookies...');
  const allCookies = request.cookies.getAll();
  console.log('🔍 Token extraction: All cookies:', allCookies.map(c => c.name));

  // Try various Supabase cookie patterns
  const possibleTokenCookies = [
    'sb-access-token',
    'supabase-auth-token', 
    'supabase.auth.token',
    'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token'
  ];

  for (const cookieName of possibleTokenCookies) {
    const cookieToken = request.cookies.get(cookieName)?.value;
    if (cookieToken) {
      console.log('🔍 Token extraction: Found token in cookie:', cookieName);
      return cookieToken;
    }
  }

  // Try to extract from Supabase session cookie
  const sessionCookie = request.cookies.get('supabase-auth-token')?.value;
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.access_token) {
        console.log('🔍 Token extraction: Found token in session cookie');
        return session.access_token;
      }
    } catch (e) {
      console.log('🔍 Token extraction: Failed to parse session cookie');
    }
  }

  console.log('❌ Token extraction: No token found');
  return null;
}

/**
 * Authenticate user for API routes
 * UPDATED: Now uses unified ID system - simple_users.id = auth.users.id
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    console.log('🔍 Auth: Starting authentication...');
    const accessToken = extractAccessToken(request);
    
    if (!accessToken) {
      console.log('❌ Auth: No access token found');
      return null;
    }

    console.log('🔍 Auth: Access token found, creating Supabase client...');
    const supabase = createSupabaseClient();
    
    console.log('🔍 Auth: Getting user from Supabase with access token...');
    // Get the current user using the access token directly
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log('❌ Auth: Failed to get user, returning null');
      console.log('❌ Auth: Error details:', error);
      return null;
    }

    console.log('🔍 Auth: Got Supabase user:', user.id, user.email);

    // MIGRATION UPDATE: Since simple_users.id now equals auth.users.id,
    // we can get the profile directly without translation
    console.log('🔍 Auth: Looking up user profile with unified ID...');
    const { data: profile, error: profileError } = await supabase
      .from('simple_users')
      .select('id, email, name, email_verified, subscription_status')
      .eq('id', user.id)  // Direct lookup - no auth_user_id needed!
      .single();

    if (profileError || !profile) {
      console.log('❌ Auth: Profile lookup failed');
      console.log('❌ Auth: Profile error:', profileError);
      return null;
    }

    console.log('🔍 Auth: Found user profile:', profile);

    // Create authenticated request object
    const authenticatedRequest = request as AuthenticatedRequest;
    
    // MIGRATION UPDATE: user and authUser now have the same ID
    authenticatedRequest.user = {
      id: user.id,  // This is now the same as simple_users.id
      email: profile.email,
      name: profile.name,
      email_verified: profile.email_verified,
      subscription_status: profile.subscription_status
    };
    
    authenticatedRequest.authUser = {
      id: user.id,
      email: user.email || '',
    };

    console.log('✅ Auth: Authentication successful with unified ID');
    return authenticatedRequest;

  } catch (error) {
    console.error('❌ Auth: Authentication error:', error);
    return null;
  }
}
