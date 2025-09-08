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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required',
        success: false 
      }, { status: 400 });
    }

    console.log('Checking simulation limit for user:', userId);

    const supabaseAdmin = createSupabaseAdmin();

    // First, try to call the database function
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('check_simulation_limit', { user_id: userId });

    if (rpcError) {
      console.error('RPC Error checking simulation limit:', rpcError);
      
      // Fallback: Query the table directly
      const { data: userData, error: queryError } = await supabaseAdmin
        .from('simple_users')
        .select('simulation_count, simulation_limit, subscription_status')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
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