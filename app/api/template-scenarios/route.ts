import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

// GET: Fetch all active template scenarios with optional filtering
export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const industry = searchParams.get('industry');
    const difficulty = searchParams.get('difficulty');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '50';

    console.log('Template scenarios API request:', { 
      category, industry, difficulty, search, limit 
    });

    // Build query
    let query = supabase
      .from('template_scenarios')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(parseInt(limit));

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      templates: data || [],
      total: data?.length || 0
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get template scenarios error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// POST: Create a new template scenario (admin only)
export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { 
      title,
      prompt,
      category,
      industry,
      difficulty,
      prospect_name,
      voice,
      description,
      learning_objectives,
      success_criteria,
      common_objections,
      coaching_tips,
      estimated_duration,
      tags,
      userId
    } = body;

    // Validate required fields
    if (!title || !prompt || !category || !difficulty || !description) {
      return errorResponse('Missing required fields: title, prompt, category, difficulty, description');
    }

    if (!userId) {
      return errorResponse('userId is required');
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

    // Prepare template data
    const templateData = {
      title,
      prompt,
      category,
      industry: industry || null,
      difficulty,
      prospect_name: prospect_name || null,
      voice: voice || null,
      description,
      learning_objectives: learning_objectives || [],
      success_criteria: success_criteria || [],
      common_objections: common_objections || [],
      coaching_tips: coaching_tips || [],
      estimated_duration: estimated_duration || 300,
      tags: tags || [],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('template_scenarios')
      .insert([templateData])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      success: true,
      templateId: data.id,
      template: data,
      message: 'Template scenario created successfully'
    }, 201, corsHeaders);

  } catch (error) {
    console.error('Create template scenario error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}