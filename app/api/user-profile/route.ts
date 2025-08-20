import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authUserId = searchParams.get('authUserId');
    
    if (!authUserId) {
      return NextResponse.json({ 
        error: 'authUserId is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Get the simple_users record for this auth user
    const { data: userProfile, error } = await supabaseAdmin
      .from('simple_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !userProfile) {
      // Try to find by direct ID match as fallback
      const { data: fallbackProfile, error: fallbackError } = await supabaseAdmin
        .from('simple_users')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (fallbackError || !fallbackProfile) {
        return NextResponse.json({ 
          error: 'User profile not found',
          details: error?.message || fallbackError?.message,
          success: false 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true,
        userProfile: fallbackProfile
      });
    }

    return NextResponse.json({ 
      success: true,
      userProfile
    });

  } catch (error) {
    console.error('User profile error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user profile',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}
