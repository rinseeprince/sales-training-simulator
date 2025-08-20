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

export async function POST(req: NextRequest) {
  try {
    const { authUserId } = await req.json();

    if (!authUserId) {
      return NextResponse.json({ 
        error: 'authUserId is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // Update the email_verified status in simple_users
    const { error } = await supabaseAdmin
      .from('simple_users')
      .update({ 
        email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', authUserId);

    if (error) {
      console.error('Error updating email verification status:', error);
      return NextResponse.json({ 
        error: 'Failed to update email verification status',
        details: error.message,
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email verification status updated successfully'
    });

  } catch (error) {
    console.error('Update email verified error:', error);
    return NextResponse.json({ 
      error: 'Failed to update email verification status',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}
