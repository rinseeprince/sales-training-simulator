import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // MIGRATION UPDATE: Direct lookup with unified ID
    // No need for auth_user_id translation anymore
    const { data: userProfile, error } = await supabaseAdmin
      .from('simple_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      return NextResponse.json({ 
        error: 'User not found',
        details: error?.message,
        success: false 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      ...userProfile
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // MIGRATION UPDATE: Direct update with unified ID
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('simple_users')
      .update({
        name: body.name,
        avatar_url: body.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        details: error.message,
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      userProfile: updatedProfile
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
} 