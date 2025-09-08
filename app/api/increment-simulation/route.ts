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

    const supabaseAdmin = createSupabaseAdmin();

    // First try the database function
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
        // For new users, still allow the simulation but log the issue
        return NextResponse.json({ 
          success: true,
          count: 1,
          limit: 50,
          remaining: 49,
          message: 'Simulation started (new user)'
        });
      }

      // Check if user has reached limit (for free users)
      const count = userData.simulation_count || 0;
      const limit = userData.simulation_limit || 50;
      const isPaid = userData.subscription_status === 'paid' || userData.subscription_status === 'trial';
      
      if (!isPaid && count >= limit) {
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
        remaining: isPaid ? -1 : Math.max(0, limit - (count + 1))
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