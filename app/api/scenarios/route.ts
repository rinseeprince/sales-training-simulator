import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { withOrganizationAuth, AuthenticatedRequest } from '@/lib/organization-middleware';

// GET: Fetch all scenarios for organization (enterprise-ready)
export const GET = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeShared = searchParams.get('includeShared') === 'true';
      
      console.log('Organization API: Scenarios request:', { 
        userId: req.user.id, 
        organizationId: req.user.organization_id,
        orgName: req.organization.name,
        userRole: req.user.role
      });

      let query = supabase
        .from('scenarios')
        .select(`
          id,
          title,
          prompt,
          prospect_name,
          duration,
          voice,
          created_at,
          updated_at,
          user_id,
          organization_id,
          is_company_generated,
          created_by:simple_users!scenarios_created_by_fkey(id, name, email)
        `)
        .eq('organization_id', req.user.organization_id);

      // If not including shared scenarios, only show user's own scenarios
      if (!includeShared) {
        query = query.eq('user_id', req.user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100); // Add reasonable limit to improve performance

      if (error) {
        console.error('Supabase fetch error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        scenarios: data || [],
        organization: {
          id: req.organization.id,
          name: req.organization.name,
          subscription_tier: req.organization.subscription_tier
        },
        user: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email
        },
        meta: {
          total: data?.length || 0,
          includeShared
        }
      }, 200, corsHeaders);

    } catch (error) {
      console.error('Get scenarios error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    logAction: 'VIEW_SCENARIOS'
  }
);

// POST: Save a new scenario with organization context
export const POST = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      // Parse request body
      const body = await req.json();
      const { 
        title, 
        prompt, 
        prospectName,
        duration,
        voice,
        persona,
        difficulty,
        industry,
        tags,
        settings
      } = body;

      // Validate required fields
      if (!title || !prompt) {
        return errorResponse('title and prompt are required');
      }

      // Prepare scenario data with organization context
      const scenarioData = {
        user_id: req.user.id,
        organization_id: req.user.organization_id,
        title: title,
        prompt: prompt,
        prospect_name: prospectName,
        duration: duration || null,
        voice: voice || null,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('scenarios')
        .insert([scenarioData])
        .select(`
          *,
          created_by:simple_users!scenarios_created_by_fkey(id, name, email)
        `)
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        success: true,
        scenarioId: data.id,
        scenario: data,
        message: 'Scenario saved successfully'
      }, 201, corsHeaders);

    } catch (error) {
      console.error('Save scenario error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    logAction: 'CREATE_SCENARIO'
  }
);

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 