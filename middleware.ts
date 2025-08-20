import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for middleware
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define route patterns that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/scenarios',
  '/simulation',
  '/review',
  '/simulations',
  '/scenario-builder',
  '/saved-scenarios',
  '/settings',
  '/admin',
  '/compliance'
];

// Define public routes (don't require authentication)
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/callback',
  '/auth/auth-code-error',
  '/pricing'
];

/**
 * Extract Supabase access token from request
 */
function extractAccessToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check Supabase auth cookies - try multiple cookie name patterns
  const accessToken = request.cookies.get('sb-access-token')?.value ||
                     request.cookies.get('supabase-auth-token')?.value ||
                     request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`)?.value;
  
  if (accessToken) {
    return accessToken;
  }

  return null;
}

/**
 * Verify Supabase session and get user
 */
async function verifySupabaseSession(accessToken: string) {
  try {
    // Set the access token for this request
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return null;
    }

    // Get additional user data from simple_users table
    const { data: profile, error: profileError } = await supabase
      .from('simple_users')
      .select('id, email, name, email_verified, subscription_status')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError) {
      // User might not be synced yet, create basic profile
      console.log('User profile not found, might need sync:', user.email);
      return {
        user: {
          id: user.id,
          email: user.email,
          email_verified: !!user.email_confirmed_at
        },
        needsSync: true
      };
    }

    return {
      user: profile,
      authUser: user,
      needsSync: false
    };

  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Check if route requires authentication
 */
function requiresAuth(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
}

/**
 * Get redirect URL for unauthorized access
 */
function getRedirectUrl(request: NextRequest, reason: string): string {
  const url = request.nextUrl.clone();
  
  switch (reason) {
    case 'unauthenticated':
      url.pathname = '/auth/signin';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return url.toString();
    
    case 'email_not_verified':
      url.pathname = '/auth/signin';
      url.searchParams.set('message', 'Please verify your email address');
      return url.toString();
    
    default:
      url.pathname = '/auth/signin';
      return url.toString();
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and favicon
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For now, let client-side auth handle everything
  // TODO: Re-implement proper middleware once auth is stable
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};