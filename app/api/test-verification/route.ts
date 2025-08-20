import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing',
        success: false 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
      return NextResponse.json({ 
        error: 'User not found',
        details: userError?.message,
        success: false 
      }, { status: 404 });
    }

    console.log('Found user:', { 
      id: userData.user.id, 
      email: userData.user.email,
      emailConfirmed: userData.user.email_confirmed_at 
    });

    // If email is already confirmed, return success
    if (userData.user.email_confirmed_at) {
      return NextResponse.json({ 
        success: true,
        message: 'Email already verified',
        user: {
          id: userData.user.id,
          email: userData.user.email,
          email_confirmed_at: userData.user.email_confirmed_at
        }
      });
    }

    // Manually confirm the email
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { email_confirm: true }
    );

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to verify email',
        details: updateError.message,
        success: false 
      }, { status: 500 });
    }

    console.log('Email verified successfully:', updateData.user?.email_confirmed_at);

    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully',
      user: {
        id: updateData.user?.id,
        email: updateData.user?.email,
        email_confirmed_at: updateData.user?.email_confirmed_at
      }
    });

  } catch (error) {
    console.error('Test verification error:', error);
    return NextResponse.json({ 
      error: 'Test verification failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}
