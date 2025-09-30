import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, AuthenticatedRequest, getOrganizationMembers, checkOrganizationLimits } from '@/lib/organization-middleware';
import { supabase, errorResponse, successResponse, corsHeaders } from '@/lib/api-utils';

// GET: Get organization details and usage
export const GET = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeUsage = searchParams.get('includeUsage') === 'true';
      const includeMembers = searchParams.get('includeMembers') === 'true';

      // Get organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', req.user.organization_id)
        .single();

      if (orgError || !organization) {
        return errorResponse('Organization not found', 404);
      }

      const response: any = {
        organization,
        currentUser: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      };

      // Include current usage if requested
      if (includeUsage) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        // Get current usage
        const { data: usage } = await supabase
          .from('organization_usage')
          .select('*')
          .eq('organization_id', req.user.organization_id)
          .eq('month_year', currentMonth)
          .single();

        // Get usage limits
        const userLimit = await checkOrganizationLimits(req.user.organization_id, 'users');
        const simulationLimit = await checkOrganizationLimits(req.user.organization_id, 'simulations');
        const storageLimit = await checkOrganizationLimits(req.user.organization_id, 'storage');

        response.usage = {
          current: usage || {
            simulations_used: 0,
            storage_used_mb: 0,
            api_calls: 0,
            unique_users: 0
          },
          limits: {
            users: userLimit,
            simulations: simulationLimit,
            storage: storageLimit
          },
          month_year: currentMonth
        };
      }

      // Include organization members if requested (manager/admin only)
      if (includeMembers && ['manager', 'admin'].includes(req.user.role)) {
        try {
          const members = await getOrganizationMembers(req);
          response.members = members;
        } catch (error) {
          console.error('Error fetching members:', error);
          // Don't fail the request, just don't include members
        }
      }

      return successResponse(response, 200, corsHeaders);

    } catch (error) {
      console.error('Get organization error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    logAction: 'VIEW_ORGANIZATION'
  }
);

// PUT: Update organization settings (admin only)
export const PUT = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json();
      
      // Only allow updating certain fields
      const allowedFields = ['name', 'settings', 'billing_email', 'logo_url'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
      
      updateData.updated_at = new Date().toISOString();

      // Update organization
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', req.user.organization_id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        success: true,
        organization: data,
        message: 'Organization updated successfully'
      }, 200, corsHeaders);

    } catch (error) {
      console.error('Update organization error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    requiredRoles: ['admin'],
    logAction: 'UPDATE_ORGANIZATION'
  }
);

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}