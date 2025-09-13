import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';

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
    console.log('🔍 Check simulation limit API called');
    
    // Authenticate the user
    const authUser = await authenticateWithRBAC(request);
    if (!authUser) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', authUser.user.id);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Use the authenticated user's ID if no userId provided, or verify they match
    const targetUserId = userId || authUser.user.id;
    
    if (userId && userId !== authUser.user.id && authUser.userRole !== 'admin') {
      console.log('❌ User trying to check limits for different user');
      return NextResponse.json({ 
        error: 'Forbidden - can only check your own limits',
        success: false 
      }, { status: 403 });
    }

    console.log('🔍 Checking simulation limit for user:', targetUserId);

    const supabaseAdmin = createSupabaseAdmin();

    // Debug: Let's check what user data exists in the database
    const { data: debugUserData, error: debugError } = await supabaseAdmin
      .from('simple_users')
      .select('id, auth_user_id, email, simulation_count, simulation_limit, subscription_status')
      .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`);
    
    console.log('🔍 Debug user data for ID:', targetUserId);
    console.log('🔍 Found users:', debugUserData);
    console.log('🔍 Debug query error:', debugError);

    // First, try to call the database function
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('check_simulation_limit', { user_id: targetUserId });

    if (rpcError) {
      console.error('RPC Error checking simulation limit:', rpcError);
      
      // Fallback: Query the table directly
      const { data: userData, error: queryError } = await supabaseAdmin
        .from('simple_users')
        .select('simulation_count, simulation_limit, subscription_status')
        .or(`id.eq.${targetUserId},auth_user_id.eq.${targetUserId}`)
        .single();

      if (queryError || !userData) {
        console.error('Fallback query error:', queryError);
        // New user - return default limits
        return NextResponse.json({ 
          success: true,
          canSimulate: true,
          count: 0,
          limit: 50,
          remaining: 50,
          is_paid: false,
          message: 'Welcome! You have 50 free simulations.'
        });
      }

      // Process the direct query data
      const count = userData.simulation_count || 0;
      const limit = userData.simulation_limit || 50;
      const isPaid = userData.subscription_status === 'paid' || userData.subscription_status === 'trial';
      
      return NextResponse.json({ 
        success: true,
        canSimulate: isPaid || count < limit,
        count: count,
        limit: limit,
        remaining: isPaid ? -1 : Math.max(0, limit - count),
        is_paid: isPaid,
        message: count >= limit && !isPaid ? 'You have reached your free simulation limit. Please upgrade to continue.' : null
      });
    }

    console.log('RPC Response:', rpcData);

    // If RPC succeeded but returned null/undefined, treat as new user
    if (!rpcData) {
      return NextResponse.json({ 
        success: true,
        canSimulate: true,
        count: 0,
        limit: 50,
        remaining: 50,
        is_paid: false,
        message: 'Welcome! You have 50 free simulations.'
      });
    }

    return NextResponse.json({ 
      success: true,
      ...rpcData
    });

  } catch (error) {
    console.error('Check simulation limit error:', error);
    // Even on error, allow new users to proceed with defaults
    return NextResponse.json({ 
      success: true,
      canSimulate: true,
      count: 0,
      limit: 50,
      remaining: 50,
      is_paid: false,
      message: 'Welcome! You have 50 free simulations.'
    });
  }
} 