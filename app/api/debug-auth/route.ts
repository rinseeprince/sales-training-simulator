import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

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

export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH DEBUG START ===');
    
    // Get all headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', headers);
    
    // Get all cookies
    const cookies = Object.fromEntries(
      request.cookies.getAll().map(cookie => [cookie.name, cookie.value])
    );
    console.log('Request cookies:', cookies);
    
    // Extract token using our middleware logic
    const token = extractAccessToken(request);
    console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');
    
    if (!token) {
      return NextResponse.json({
        error: 'No token found',
        debug: {
          hasAuthHeader: !!headers.authorization,
          hasSbAccessToken: !!cookies['sb-access-token'],
          allCookieKeys: Object.keys(cookies),
          allHeaderKeys: Object.keys(headers)
        }
      }, { status: 401 });
    }
    
    // Try to validate token with Supabase
    const supabase = createSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('Supabase auth result:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      error: error?.message 
    });
    
    if (error || !user) {
      return NextResponse.json({
        error: 'Token validation failed',
        debug: {
          supabaseError: error?.message,
          hasUser: !!user,
          tokenValid: false
        }
      }, { status: 401 });
    }
    
    // Try to get user profile
    const { data: profile, error: profileError } = await supabase
      .from('simple_users')
      .select('id, email, name, role, organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    console.log('Profile lookup result:', { 
      profile: profile ? { id: profile.id, email: profile.email, role: profile.role } : null, 
      error: profileError?.message 
    });
    
    console.log('=== AUTH DEBUG END ===');
    
    return NextResponse.json({
      success: true,
      debug: {
        tokenFound: true,
        tokenValid: true,
        user: {
          id: user.id,
          email: user.email,
          emailConfirmed: user.email_confirmed_at
        },
        profile: profile ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          organizationId: profile.organization_id
        } : null,
        profileError: profileError?.message,
        cookies: Object.keys(cookies),
        hasAuthHeader: !!headers.authorization
      }
    });
    
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}