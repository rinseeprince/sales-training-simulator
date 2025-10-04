import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, authenticateWithOrganization } from '@/lib/organization-middleware';
import { checkOrganizationLimits } from '@/lib/organization-middleware';
import { authenticateUser } from '@/lib/supabase-auth-middleware';
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
    // First, try to authenticate with organization context
    const orgAuthRequest = await authenticateWithOrganization(request);
    
    if (orgAuthRequest) {
      // User has organization - use organization-based limits
      const organization = orgAuthRequest.organization;
      const user = orgAuthRequest.user;
      
      console.log('🔐 Organization user checking limits:', { 
        userId: user.id, 
        orgId: organization.id,
        tier: organization.subscription_tier 
      });
      
      // Check if this is an enterprise organization
      const isEnterprise = organization.subscription_tier === 'enterprise';
      
      if (isEnterprise) {
        // Enterprise users get unlimited simulations
        return NextResponse.json({ 
          success: true,
          canSimulate: true,
          count: 0,
          limit: -1,
          remaining: -1,
          is_paid: true,
          message: 'Enterprise account - unlimited simulations'
        });
      }
      
      // For non-enterprise organizations, check organization simulation limits
      const limits = await checkOrganizationLimits(organization.id, 'simulations');
      
      const canSimulate = limits.allowed;
      const count = limits.current;
      const limit = limits.max;
      const remaining = Math.max(0, limit - count);
      const isPaid = organization.subscription_tier === 'paid' || organization.subscription_tier === 'trial';
      
      return NextResponse.json({ 
        success: true,
        canSimulate,
        count,
        limit,
        remaining,
        is_paid: isPaid,
        message: !canSimulate ? 'Your organization has reached its simulation limit for this month. Please contact your admin or upgrade.' : null
      });
    }
    
    // If not an org user, try simple authentication for free users
    const freeUserAuth = await authenticateUser(request);
    
    if (!freeUserAuth) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized - please sign in'
      }, { status: 401 });
    }
    
    // Free user - check their personal simulation limits
    console.log('🆓 Free user checking limits:', { userId: freeUserAuth.user.id });
    
    const supabase = createSupabaseAdmin();
    
    const { data: userData, error: userError } = await supabase
      .from('simple_users')
      .select('simulation_count, simulation_limit, subscription_status')
      .eq('id', freeUserAuth.user.id)
      .single();
    
    if (userError || !userData) {
      console.error('Failed to fetch user data:', userError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch user limits'
      }, { status: 500 });
    }
    
    const count = userData.simulation_count || 0;
    const limit = userData.simulation_limit || 2; // Default 2 for free users
    const remaining = Math.max(0, limit - count);
    const canSimulate = count < limit;
    const isPaid = userData.subscription_status === 'paid' || userData.subscription_status === 'trial';
    
    console.log('🆓 Free user limits:', { count, limit, remaining, canSimulate, isPaid });
    
    return NextResponse.json({ 
      success: true,
      canSimulate,
      count,
      limit,
      remaining,
      is_paid: isPaid,
      message: !canSimulate ? 'You have reached your free simulation limit (2 simulations). Upgrade to continue practicing!' : null
    });

  } catch (error) {
    console.error('Check simulation limit error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check simulation limit'
    }, { status: 500 });
  }
} 