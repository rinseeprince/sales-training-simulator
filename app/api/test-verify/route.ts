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

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    const supabaseAdmin = createSupabaseAdmin();

    // Try to get the user from auth.users
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Failed to get user',
        details: authError.message,
        success: false 
      }, { status: 500 });
    }

    if (!authUser.user) {
      return NextResponse.json({ 
        error: 'User not found',
        success: false 
      }, { status: 404 });
    }

    // Try to manually verify the email
    const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.user.id,
      { email_confirm: true }
    );

    if (verifyError) {
      return NextResponse.json({ 
        error: 'Failed to verify email',
        details: verifyError.message,
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully',
      user: verifyData.user
    });

  } catch (error) {
    console.error('Test verify error:', error);
    return NextResponse.json({ 
      error: 'Test verify failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}