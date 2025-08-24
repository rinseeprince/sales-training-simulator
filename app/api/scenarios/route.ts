import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

// GET: Fetch all scenarios for the current user
export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Get user ID from query params or headers (you might want to implement proper auth)
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || req.headers.get('x-user-id');

    console.log('Scenarios API request:', { userId, url: req.url, method: req.method });

    if (!userId) {
      return errorResponse('userId is required', 401);
    }

    // Fetch scenarios from Supabase
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      scenarios: data || []
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Get scenarios error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// POST: Save a new scenario
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
      settings, 
      userId,
      persona,
      difficulty,
      industry,
      tags
    } = body;

    // Validate required fields
    if (!title || !prompt) {
      return errorResponse('title and prompt are required');
    }

    if (!userId) {
      return errorResponse('userId is required');
    }

    // Prepare scenario data - only essential fields
    const scenarioData: any = {
      user_id: userId,
      title: title,
      prompt: prompt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Only add optional fields if they exist in the request
    if (settings !== undefined) scenarioData.settings = settings;
    if (persona !== undefined) scenarioData.persona = persona;
    if (industry !== undefined) scenarioData.industry = industry;
    if (tags !== undefined) scenarioData.tags = tags;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('scenarios')
      .insert([scenarioData])
      .select()
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
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 