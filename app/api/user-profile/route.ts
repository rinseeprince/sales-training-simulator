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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { authUserId, name } = body;
    
    if (!authUserId) {
      return NextResponse.json({ 
        error: 'authUserId is required',
        success: false 
      }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ 
        error: 'Name is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Update the simple_users record for this auth user
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('simple_users')
      .update({ 
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', authUserId)
      .select()
      .single();

    if (error) {
      // Try with direct id match as fallback
      const { data: fallbackUpdate, error: fallbackError } = await supabaseAdmin
        .from('simple_users')
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', authUserId)
        .select()
        .single();

      if (fallbackError || !fallbackUpdate) {
        return NextResponse.json({ 
          error: 'Failed to update profile',
          details: error?.message || fallbackError?.message,
          success: false 
        }, { status: 500 });
      }

      // Also update Supabase auth metadata for consistency
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          user_metadata: { name: name.trim() }
        });
      } catch (metadataErr) {
        console.warn('Failed to update auth metadata (non-critical):', metadataErr);
      }

      return NextResponse.json({ 
        success: true,
        userProfile: fallbackUpdate,
        message: 'Profile updated successfully'
      });
    }

    // Also update Supabase auth metadata for consistency
    try {
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: { name: name.trim() }
      });
    } catch (metadataErr) {
      console.warn('Failed to update auth metadata (non-critical):', metadataErr);
    }

    return NextResponse.json({ 
      success: true,
      userProfile: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ 
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}
