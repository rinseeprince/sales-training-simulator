import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is currently disabled - all auth handled client-side
// TODO: Re-implement proper middleware once auth is stable

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
