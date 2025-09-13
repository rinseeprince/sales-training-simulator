import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { authenticateWithRBAC } from '@/lib/rbac-middleware';

// GET: Fetch all scenarios for the current user
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Scenarios API called');
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Authenticate user with RBAC
    const authUser = await authenticateWithRBAC(req);
    if (!authUser) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', authUser.user.id);

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');
    
    // Use authenticated user's ID, but allow admins to query other users
    const userId = requestedUserId && authUser.userRole === 'admin' ? requestedUserId : authUser.user.id;

    console.log('🔍 Scenarios API request:', { userId, requestedUserId, userRole: authUser.userRole });

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
    console.log('🔍 Scenarios POST API called');
    
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Authenticate user with RBAC
    const authUser = await authenticateWithRBAC(req);
    if (!authUser) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', authUser.user.id);

    // Parse request body
    const body = await req.json();
    const { 
      title, 
      prompt, 
      prospectName,
      duration,
      voice,
      userId,
      is_company_generated
    } = body;

    console.log('🔍 Scenario data:', { title, userId, is_company_generated });

    // Validate required fields
    if (!title || !prompt) {
      return errorResponse('title and prompt are required');
    }

    // Use authenticated user's ID, but allow admins to create for other users
    const targetUserId = userId && authUser.userRole === 'admin' ? userId : authUser.user.id;

    // Prepare scenario data - PROMPT-ONLY SYSTEM with duration, voice, and prospect name
    const scenarioData = {
      user_id: targetUserId,
      title: title,  // The DB column is 'title', not 'name'
      prompt: prompt,
      prospect_name: prospectName,
      duration: duration || null,
      voice: voice || null,
      is_company_generated: is_company_generated || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔍 Inserting scenario:', scenarioData);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('scenarios')
      .insert([scenarioData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    console.log('✅ Scenario saved:', data);

    return successResponse({
      success: true,
      scenarioId: data.id,
      scenario: data,
      message: 'Scenario saved successfully'
    }, 201, corsHeaders);

  } catch (error) {
    console.error('❌ Save scenario error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 