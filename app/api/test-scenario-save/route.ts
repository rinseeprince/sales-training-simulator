import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse request body
    const body = await req.json();
    
    console.log('Test scenario save request:', body);

    // Validate required fields
    if (!body.title || !body.prompt) {
      return errorResponse('title and prompt are required');
    }

    // Simulate successful save
    const mockScenario = {
      id: `test-${Date.now()}`,
      title: body.title,
      prompt: body.prompt,
      settings: body.settings || {},
      created_at: new Date().toISOString(),
      message: 'Test scenario saved successfully'
    };

    return successResponse(mockScenario, 201, corsHeaders);

  } catch (error) {
    console.error('Test scenario save error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 