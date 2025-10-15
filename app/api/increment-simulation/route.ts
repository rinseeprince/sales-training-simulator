import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateWithOrganization, incrementOrganizationUsage } from '@/lib/organization-middleware';
import { authenticateUser } from '@/lib/supabase-auth-middleware';

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
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required',
        success: false 
      }, { status: 400 });
    }

    console.log('Incrementing simulation count for user:', userId);

    // Check if this is an organization user
    const orgAuthRequest = await authenticateWithOrganization(request);
    
    if (orgAuthRequest) {
      // Organization user - implement dual tracking
      console.log('🏢 Organization user incrementing simulation:', { 
        userId: orgAuthRequest.user.id, 
        orgId: orgAuthRequest.organization.id 
      });
      
      const supabaseAdmin = createSupabaseAdmin();
      
      // Get current user data
      const { data: userData, error: userError } = await supabaseAdmin
        .from('simple_users')
        .select('simulation_count, simulation_limit')
        .eq('id', orgAuthRequest.user.id)
        .single();

      if (userError || !userData) {
        console.error('Failed to find organization user for increment:', userError);
        return NextResponse.json({ 
          success: false,
          error: 'User not found'
        }, { status: 404 });
      }

      const userCount = userData.simulation_count || 0;
      const userLimit = userData.simulation_limit || 10;

      // Check individual user limit
      if (userCount >= userLimit) {
        return NextResponse.json({ 
          success: false,
          error: 'Personal simulation limit reached',
          count: userCount,
          limit: userLimit,
          remaining: 0
        });
      }

      // Check organization limits using existing function
      const { checkOrganizationLimits } = await import('@/lib/organization-middleware');
      const orgLimits = await checkOrganizationLimits(orgAuthRequest.organization.id, 'simulations');
      
      if (!orgLimits.allowed) {
        return NextResponse.json({ 
          success: false,
          error: 'Organization simulation limit reached',
          count: userCount,
          limit: userLimit,
          remaining: Math.max(0, userLimit - userCount),
          orgCount: orgLimits.current,
          orgLimit: orgLimits.max,
          orgRemaining: 0
        });
      }

      // Increment both counters
      // 1. Increment individual user count
      const { error: updateError } = await supabaseAdmin
        .from('simple_users')
        .update({ 
          simulation_count: userCount + 1,
          last_simulation_at: new Date().toISOString()
        })
        .eq('id', orgAuthRequest.user.id);

      if (updateError) {
        console.error('Failed to update user simulation count:', updateError);
        return NextResponse.json({ 
          success: false,
          error: 'Failed to update user count'
        }, { status: 500 });
      }

      // 2. Increment organization usage
      await incrementOrganizationUsage(orgAuthRequest.organization.id, 1);

      return NextResponse.json({ 
        success: true,
        count: userCount + 1,
        limit: userLimit,
        remaining: Math.max(0, userLimit - (userCount + 1)),
        orgCount: orgLimits.current + 1,
        orgLimit: orgLimits.max,
        orgRemaining: Math.max(0, orgLimits.max - (orgLimits.current + 1))
      });
    }
    
    // Free user - use existing logic
    const freeUserAuth = await authenticateUser(request);
    
    if (!freeUserAuth) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - please sign in'
      }, { status: 401 });
    }

    console.log('🆓 Free user incrementing simulation:', { userId: freeUserAuth.user.id });

    const supabaseAdmin = createSupabaseAdmin();

    // First try the database function for free users
    const { data: rpcData, error: rpcError } = await supabaseAdmin
      .rpc('increment_simulation_count', { user_id: userId });

    if (rpcError) {
      console.error('RPC Error incrementing simulation count:', rpcError);
      
      // Fallback: Update the table directly
      const { data: userData, error: queryError } = await supabaseAdmin
        .from('simple_users')
        .select('simulation_count, simulation_limit, subscription_status')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .single();

      if (queryError || !userData) {
        console.error('Failed to find user for increment:', queryError);
        return NextResponse.json({ 
          success: true,
          count: 1,
          limit: 10,
          remaining: 9,
          message: 'Simulation started (new user)'
        });
      }

      // Check if user has reached limit (10 for all users)
      const count = userData.simulation_count || 0;
      const limit = userData.simulation_limit || 10;
      
      if (count >= limit) {
        return NextResponse.json({ 
          success: false,
          error: 'Simulation limit reached',
          count: count,
          limit: limit,
          remaining: 0
        });
      }

      // Manually increment the count
      const { error: updateError } = await supabaseAdmin
        .from('simple_users')
        .update({ 
          simulation_count: count + 1,
          last_simulation_at: new Date().toISOString()
        })
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`);

      if (updateError) {
        console.error('Failed to update simulation count:', updateError);
      }

      return NextResponse.json({ 
        success: true,
        count: count + 1,
        limit: limit,
        remaining: Math.max(0, limit - (count + 1))
      });
    }

    console.log('RPC increment response:', rpcData);

    // Check if the increment was successful
    if (rpcData && !rpcData.success) {
      return NextResponse.json({ 
        success: false,
        error: rpcData.error || 'Failed to increment simulation count',
        ...rpcData
      });
    }

    return NextResponse.json({ 
      success: true,
      ...rpcData
    });

  } catch (error) {
    console.error('Increment simulation error:', error);
    return NextResponse.json({ 
      error: 'Failed to increment simulation count',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
} 