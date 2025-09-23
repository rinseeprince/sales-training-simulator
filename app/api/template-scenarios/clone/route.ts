import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

// POST: Clone a template scenario to user's scenarios
export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { templateId, userId, customizations } = body;

    // Validate required fields
    if (!templateId || !userId) {
      return errorResponse('templateId and userId are required');
    }

    console.log('Clone template request:', { templateId, userId, customizations });

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('template_scenarios')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Template fetch error:', templateError);
      return errorResponse('Template not found', 404);
    }

    // Track template usage - viewed
    await supabase.rpc('track_template_usage', {
      p_template_id: templateId,
      p_user_id: userId,
      p_action_type: 'viewed'
    });

    // Prepare scenario data (merge template with any customizations)
    const scenarioData = {
      user_id: userId,
      title: customizations?.title || template.title,
      prompt: customizations?.prompt || template.prompt,
      prospect_name: customizations?.prospect_name || template.prospect_name,
      duration: customizations?.duration || template.estimated_duration,
      voice: customizations?.voice || template.voice,
      template_id: templateId,
      is_template_clone: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert cloned scenario into user's scenarios
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios')
      .insert([scenarioData])
      .select()
      .single();

    if (scenarioError) {
      console.error('Scenario insert error:', scenarioError);
      return errorResponse(`Database error: ${scenarioError.message}`, 500);
    }

    // Track template usage - cloned
    await supabase.rpc('track_template_usage', {
      p_template_id: templateId,
      p_user_id: userId,
      p_action_type: 'cloned',
      p_scenario_id: scenario.id
    });

    return successResponse({
      success: true,
      scenarioId: scenario.id,
      scenario: scenario,
      template: {
        id: template.id,
        title: template.title,
        category: template.category,
        difficulty: template.difficulty,
        learning_objectives: template.learning_objectives,
        success_criteria: template.success_criteria,
        coaching_tips: template.coaching_tips
      },
      message: 'Template cloned successfully'
    }, 201, corsHeaders);

  } catch (error) {
    console.error('Clone template error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}