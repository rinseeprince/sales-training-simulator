import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';
import { authenticateUser } from '@/lib/supabase-auth-middleware';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Authenticate user
    const authReq = await authenticateUser(req);
    if (!authReq) {
      return errorResponse('Unauthorized', 401);
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get('template') === 'true';
    const industry = searchParams.get('industry');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('business_models')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by template or user models
    if (isTemplate) {
      query = query.eq('is_template', true);
    } else {
      query = query.eq('user_id', authReq.user.id);
    }

    // Filter by industry if provided
    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return errorResponse('Failed to fetch business models', 500);
    }

    return successResponse({
      models: data || [],
      count: data?.length || 0
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get business models error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Authenticate user
    const authReq = await authenticateUser(req);
    if (!authReq) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse request body
    const body = await req.json();
    const {
      company_name,
      industry,
      company_size,
      products,
      value_propositions,
      target_markets,
      competitive_advantages,
      common_objections,
      sales_process,
      key_metrics,
      is_template = false
    } = body;

    // Validate required fields
    if (!company_name || !industry || !products) {
      return errorResponse('company_name, industry, and products are required', 400);
    }

    // Only admins can create templates
    if (is_template && authReq.user.role !== 'admin') {
      return errorResponse('Only admins can create templates', 403);
    }

    // Create business model
    const { data, error } = await supabase
      .from('business_models')
      .insert({
        user_id: authReq.user.id,
        company_name,
        industry,
        company_size,
        products,
        value_propositions: value_propositions || [],
        target_markets: target_markets || [],
        competitive_advantages: competitive_advantages || [],
        common_objections: common_objections || [],
        sales_process: sales_process || {},
        key_metrics: key_metrics || {},
        is_template
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return errorResponse('Failed to create business model', 500);
    }

    return successResponse({
      model: data,
      message: 'Business model created successfully'
    }, 201, corsHeaders);

  } catch (error) {
    console.error('Create business model error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Authenticate user
    const authReq = await authenticateUser(req);
    if (!authReq) {
      return errorResponse('Unauthorized', 401);
    }

    // Parse request body
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return errorResponse('Model ID is required', 400);
    }

    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('business_models')
      .select('user_id, is_template')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return errorResponse('Business model not found', 404);
    }

    // Only owner or admin can update
    if (existing.user_id !== authReq.user.id && authReq.user.role !== 'admin') {
      return errorResponse('Unauthorized to update this model', 403);
    }

    // Update business model
    const { data, error } = await supabase
      .from('business_models')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return errorResponse('Failed to update business model', 500);
    }

    return successResponse({
      model: data,
      message: 'Business model updated successfully'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Update business model error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Authenticate user
    const authReq = await authenticateUser(req);
    if (!authReq) {
      return errorResponse('Unauthorized', 401);
    }

    // Get model ID from query
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Model ID is required', 400);
    }

    // Check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('business_models')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return errorResponse('Business model not found', 404);
    }

    // Only owner or admin can delete
    if (existing.user_id !== authReq.user.id && authReq.user.role !== 'admin') {
      return errorResponse('Unauthorized to delete this model', 403);
    }

    // Delete business model
    const { error } = await supabase
      .from('business_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return errorResponse('Failed to delete business model', 500);
    }

    return successResponse({
      message: 'Business model deleted successfully'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Delete business model error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}