import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

// POST: Login user
export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { email, password, action } = body;

    if (!email || !password) {
      return errorResponse('email and password are required');
    }

    if (action === 'login') {
      // Login with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return errorResponse(`Login failed: ${error.message}`, 401);
      }

      // Get user profile from users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role, department, created_at')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Continue without profile data
      }

      return successResponse({
        user: data.user,
        session: data.session,
        profile: userProfile || null,
        message: 'Login successful'
      }, 200, corsHeaders);

    } else if (action === 'register') {
      // Register new user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return errorResponse(`Registration failed: ${error.message}`, 400);
      }

      // Create user profile in users table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            name: body.name || 'New User',
            role: 'rep', // Default role
            department: body.department || 'Sales',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue even if profile creation fails
        }
      }

      return successResponse({
        user: data.user,
        message: 'Registration successful. Please check your email for verification.'
      }, 201, corsHeaders);

    } else {
      return errorResponse('Invalid action. Use "login" or "register"', 400);
    }

  } catch (error) {
    console.error('Auth error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// GET: Get current user session
export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Get session from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('No valid authorization token', 401);
    }

    const token = authHeader.substring(7);

    // Verify session with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return errorResponse('Invalid or expired token', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, department, created_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    return successResponse({
      user,
      profile: profile || null
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get session error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// DELETE: Logout user
export async function DELETE(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Get session from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('No valid authorization token', 401);
    }

    const token = authHeader.substring(7);

    // Sign out with Supabase
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.error('Logout error:', error);
      // Continue anyway
    }

    return successResponse({
      message: 'Logout successful'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 