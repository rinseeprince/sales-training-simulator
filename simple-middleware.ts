import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';

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
  '/settings'
];

// Define public routes (don't require authentication)
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/verify-email'
];

/**
 * Extract session token from request
 */
function extractSessionToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const cookieToken = request.cookies.get('session_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Verify session token and get user
 */
async function verifySession(sessionToken: string) {
  try {
    const { data: session, error } = await supabase
      .from('simple_sessions')
      .select(`
        *,
        simple_users (
          id,
          email,
          name,
          email_verified,
          locked_until
        )
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session || !session.simple_users) {
      return null;
    }

    const user = session.simple_users;

    // Check if account is locked
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (Date.now() < lockedUntil.getTime()) {
        return null;
      }
    }

    // Update last activity
    await supabase
      .from('simple_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id);

    return {
      user,
      session
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
      url.pathname = '/auth/verify-email';
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

  // Check if route requires authentication
  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  // Extract session token
  const sessionToken = extractSessionToken(request);
  
  if (!sessionToken) {
    const redirectUrl = getRedirectUrl(request, 'unauthenticated');
    return NextResponse.redirect(redirectUrl);
  }

  // Verify session
  const sessionData = await verifySession(sessionToken);
  
  if (!sessionData) {
    // Invalid or expired session
    const redirectUrl = getRedirectUrl(request, 'unauthenticated');
    const response = NextResponse.redirect(redirectUrl);
    
    // Clear invalid session cookie
    response.cookies.delete('session_token');
    
    return response;
  }

  const { user, session } = sessionData;

  // Check if email is verified (except for verify-email route)
  if (!user.email_verified && !pathname.startsWith('/auth/verify-email')) {
    const redirectUrl = getRedirectUrl(request, 'email_not_verified');
    return NextResponse.redirect(redirectUrl);
  }

  // Add user info to request headers for API routes
  const response = NextResponse.next();
  
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-email', user.email);
  response.headers.set('x-session-id', session.id);

  return response;
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
