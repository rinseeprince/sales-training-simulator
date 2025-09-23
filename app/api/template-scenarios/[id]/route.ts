import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Get a specific template scenario
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    console.log('Get template scenario:', { id, userId });

    if (!id) {
      return errorResponse('Template ID is required', 400);
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('template_scenarios')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return errorResponse('Template not found', 404);
    }

    // Track template usage if userId provided
    if (userId) {
      await supabase.rpc('track_template_usage', {
        p_template_id: id,
        p_user_id: userId,
        p_action_type: 'viewed'
      });
    }

    return successResponse({
      template
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get template scenario error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// PUT: Update a template scenario (admin only)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    const { id } = params;
    const body = await req.json();
    const { userId, ...updateData } = body;

    console.log('Update template scenario:', { id, userId });

    if (!id || !userId) {
      return errorResponse('Template ID and userId are required', 400);
    }

    // Verify user is admin
    const { data: user, error: userError } = await supabase
      .from('simple_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return errorResponse('User not found', 404);
    }

    if (user.role !== 'admin') {
      return errorResponse('Admin access required', 403);
    }

    // Update the template
    const { data, error } = await supabase
      .from('template_scenarios')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Template update error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      success: true,
      template: data,
      message: 'Template updated successfully'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Update template scenario error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// DELETE: Soft delete a template scenario (admin only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    const { id } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    console.log('Delete template scenario:', { id, userId });

    if (!id || !userId) {
      return errorResponse('Template ID and userId are required', 400);
    }

    // Verify user is admin
    const { data: user, error: userError } = await supabase
      .from('simple_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return errorResponse('User not found', 404);
    }

    if (user.role !== 'admin') {
      return errorResponse('Admin access required', 403);
    }

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('template_scenarios')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Template delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      success: true,
      message: 'Template deactivated successfully'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Delete template scenario error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}