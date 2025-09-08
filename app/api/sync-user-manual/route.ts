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
 * Manually sync a specific auth user to simple_users table
 */
async function syncSpecificUser(authUserId: string): Promise<{ success: boolean; message: string; error?: string }> {
  const supabaseAdmin = createSupabaseAdmin();
  
  try {
    // Get the auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(authUserId);
    
    if (authError || !authUser.user) {
      return {
        success: false,
        message: 'Auth user not found',
        error: authError?.message || 'User not found in auth.users'
      };
    }

    const user = authUser.user;
    
    // Check if simple_users record exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('simple_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      return {
        success: false,
        message: 'Error checking existing user',
        error: checkError.message
      };
    }

    if (existingUser) {
      // User already exists, update it
             const { error: updateError } = await supabaseAdmin
         .from('simple_users')
         .update({
           email: user.email,
           name: user.user_metadata?.name || null,
           avatar_url: user.user_metadata?.avatar_url || null,
           email_verified: !!user.email_confirmed_at,
           updated_at: new Date().toISOString()
         })
         .eq('auth_user_id', authUserId);

      if (updateError) {
        return {
          success: false,
          message: 'Failed to update existing user',
          error: updateError.message
        };
      }

      return {
        success: true,
        message: 'User updated successfully'
      };
    }

    // Create new simple_users record
    const insertData = {
      id: authUserId,
      auth_user_id: authUserId,
      email: user.email!,
      name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      email_verified: !!user.email_confirmed_at,
      subscription_status: 'free',
      password_hash: 'supabase_auth',
      created_at: user.created_at,
      updated_at: user.updated_at || new Date().toISOString()
    };
    
    const { error: insertError } = await supabaseAdmin
      .from('simple_users')
      .insert(insertData);

    if (insertError) {
      return {
        success: false,
        message: 'Failed to create simple_users record',
        error: insertError.message
      };
    }

    return {
      success: true,
      message: 'User synced successfully'
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error in syncSpecificUser',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync all auth users to simple_users table
 */
async function syncAllUsers(): Promise<{ success: boolean; message: string; synced: number; errors: number }> {
  const supabaseAdmin = createSupabaseAdmin();
  
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError || !authUsers.users) {
      return {
        success: false,
        message: 'Failed to fetch auth users',
        synced: 0,
        errors: 1
      };
    }

    let synced = 0;
    let errors = 0;

    for (const user of authUsers.users) {
      try {
        // Check if simple_users record exists
        const { data: existingUser } = await supabaseAdmin
          .from('simple_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

                 const userData = {
           id: user.id,
           auth_user_id: user.id,
           email: user.email!,
           name: user.user_metadata?.name || null,
           avatar_url: user.user_metadata?.avatar_url || null,
           email_verified: !!user.email_confirmed_at,
           subscription_status: 'free',
           password_hash: 'supabase_auth',
           created_at: user.created_at,
           updated_at: user.updated_at || new Date().toISOString()
         };

        if (existingUser) {
          // Update existing user
                     await supabaseAdmin
             .from('simple_users')
             .update({
               email: userData.email,
               name: userData.name,
               avatar_url: userData.avatar_url,
               email_verified: userData.email_verified,
               updated_at: userData.updated_at
             })
             .eq('auth_user_id', user.id);
        } else {
          // Insert new user
          await supabaseAdmin
            .from('simple_users')
            .insert(userData);
        }

        synced++;
      } catch (error) {
        console.error(`Failed to sync user ${user.email}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      message: `Sync completed. ${synced} users synced, ${errors} errors.`,
      synced,
      errors
    };

  } catch (error) {
    return {
      success: false,
      message: 'Error in syncAllUsers',
      synced: 0,
      errors: 1
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authUserId, syncAll } = body;

    if (syncAll) {
      // Sync all users
      const result = await syncAllUsers();
      return NextResponse.json(result);
    } else if (authUserId) {
      // Sync specific user
      const result = await syncSpecificUser(authUserId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ 
        success: false,
        message: 'Either authUserId or syncAll flag is required'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Failed to sync user(s)',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 