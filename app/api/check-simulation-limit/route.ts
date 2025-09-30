import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { checkOrganizationLimits } from '@/lib/organization-middleware';

export const GET = withOrganizationAuth(
  async (request) => {
    try {
      const organization = request.organization;
      const user = request.user;
      
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
      
      // For non-enterprise, check organization simulation limits
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

    } catch (error) {
      console.error('Check simulation limit error:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to check simulation limit'
      }, { status: 500 });
    }
  }
); 