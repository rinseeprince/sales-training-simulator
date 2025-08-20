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

/**
 * Sync auth user to simple_users table
 */
async function syncUserToSimpleUsers(authUserId: string, email: string, name?: string): Promise<boolean> {
  const supabaseAdmin = createSupabaseAdmin();
  
  try {
    // Check if simple_users record exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('simple_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking existing user:', checkError);
      return false;
    }

    if (existingUser) {
      // User already exists in simple_users
      console.log('User already exists in simple_users:', email);
      return true;
    }

    // Create simple_users record manually
    const insertData = {
      id: authUserId,
      auth_user_id: authUserId,
      email: email,
      name: name || null,
      email_verified: false,
      subscription_status: 'free',
      password_hash: 'supabase_auth',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Inserting user data:', insertData);
    
    const { error: insertError } = await supabaseAdmin
      .from('simple_users')
      .insert(insertData);

    if (insertError) {
      console.error('Error creating simple_users record:', insertError);
      return false;
    }

    console.log('Successfully created simple_users record for:', email);
    return true;

  } catch (error) {
    console.error('Error in syncUserToSimpleUsers:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authUserId, email, name } = await req.json();

    if (!authUserId || !email) {
      return NextResponse.json(
        { success: false, error: 'authUserId and email are required' },
        { status: 400 }
      );
    }

    const syncSuccess = await syncUserToSimpleUsers(authUserId, email, name);

    if (syncSuccess) {
      return NextResponse.json({ success: true, message: 'User synced successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to sync user' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API error syncing user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
