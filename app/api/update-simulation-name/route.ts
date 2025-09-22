import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const body = await req.json();
    const { callId, simulationName } = body;

    // Validate required fields
    if (!callId || !simulationName?.trim()) {
      return errorResponse('callId and simulationName are required');
    }

    // Update the call's scenario_name field
    const { data, error } = await supabase
      .from('calls')
      .update({ 
        scenario_name: simulationName.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      success: true,
      message: 'Simulation name updated successfully',
      call: data
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Update simulation name error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}