import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth, AuthenticatedRequest, incrementOrganizationUsage } from '@/lib/organization-middleware';
import { supabase, errorResponse, successResponse, corsHeaders } from '@/lib/api-utils';

// GET: Fetch all scenarios for the organization
export const GET = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const includeShared = searchParams.get('includeShared') === 'true';
      
      let query = supabase
        .from('scenarios')
        .select(`
          *,
          created_by:simple_users!scenarios_created_by_fkey(id, name, email),
          organization:organizations!scenarios_organization_id_fkey(id, name)
        `)
        .eq('organization_id', req.user.organization_id);

      // If not including shared scenarios, only show user's own scenarios
      if (!includeShared) {
        query = query.eq('user_id', req.user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        scenarios: data || [],
        organization: req.organization,
        user: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role
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
        settings,
        isCompanyGenerated = false
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
        persona: persona || 'potential customer',
        difficulty: difficulty || 'medium',
        industry: industry || 'general',
        tags: tags || [],
        settings: settings || {},
        is_company_generated: isCompanyGenerated,
        created_by: req.user.id,
        voice_settings: settings?.voiceSettings || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('scenarios')
        .insert([scenarioData])
        .select(`
          *,
          created_by:simple_users!scenarios_created_by_fkey(id, name, email),
          organization:organizations!scenarios_organization_id_fkey(id, name)
        `)
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      // Note: We don't increment usage for scenario creation since it's not a simulation
      // Usage is tracked when simulations are actually run

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

// PUT: Update an existing scenario
export const PUT = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const scenarioId = searchParams.get('id');
      
      if (!scenarioId) {
        return errorResponse('Scenario ID is required');
      }

      // Parse request body
      const body = await req.json();
      const updateData = {
        ...body,
        updated_at: new Date().toISOString()
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.organization_id;
      delete updateData.created_at;

      // Check if user can update this scenario (owner or admin/manager)
      const { data: existingScenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('user_id, organization_id')
        .eq('id', scenarioId)
        .single();

      if (fetchError || !existingScenario) {
        return errorResponse('Scenario not found', 404);
      }

      // Ensure user can only update scenarios in their organization
      if (existingScenario.organization_id !== req.user.organization_id) {
        return errorResponse('Access denied', 403);
      }

      // Check if user owns the scenario or has admin/manager role
      const canUpdate = existingScenario.user_id === req.user.id || 
                       ['admin', 'manager'].includes(req.user.role);
      
      if (!canUpdate) {
        return errorResponse('You can only update your own scenarios', 403);
      }

      // Update the scenario
      const { data, error } = await supabase
        .from('scenarios')
        .update(updateData)
        .eq('id', scenarioId)
        .select(`
          *,
          created_by:simple_users!scenarios_created_by_fkey(id, name, email),
          organization:organizations!scenarios_organization_id_fkey(id, name)
        `)
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        success: true,
        scenario: data,
        message: 'Scenario updated successfully'
      }, 200, corsHeaders);

    } catch (error) {
      console.error('Update scenario error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    logAction: 'UPDATE_SCENARIO'
  }
);

// DELETE: Delete a scenario
export const DELETE = withOrganizationAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const scenarioId = searchParams.get('id');
      
      if (!scenarioId) {
        return errorResponse('Scenario ID is required');
      }

      // Check if user can delete this scenario (owner or admin)
      const { data: existingScenario, error: fetchError } = await supabase
        .from('scenarios')
        .select('user_id, organization_id, title')
        .eq('id', scenarioId)
        .single();

      if (fetchError || !existingScenario) {
        return errorResponse('Scenario not found', 404);
      }

      // Ensure user can only delete scenarios in their organization
      if (existingScenario.organization_id !== req.user.organization_id) {
        return errorResponse('Access denied', 403);
      }

      // Check if user owns the scenario or has admin role
      const canDelete = existingScenario.user_id === req.user.id || 
                       req.user.role === 'admin';
      
      if (!canDelete) {
        return errorResponse('You can only delete your own scenarios', 403);
      }

      // Delete the scenario
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', scenarioId);

      if (error) {
        console.error('Supabase delete error:', error);
        return errorResponse(`Database error: ${error.message}`, 500);
      }

      return successResponse({
        success: true,
        message: `Scenario "${existingScenario.title}" deleted successfully`
      }, 200, corsHeaders);

    } catch (error) {
      console.error('Delete scenario error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
  {
    requiredRoles: ['user', 'manager', 'admin'], // Users can delete their own, admins can delete any
    logAction: 'DELETE_SCENARIO'
  }
);

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}