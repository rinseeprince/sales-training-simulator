import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

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
      transcript, 
      repId, 
      scenarioName, 
      timestamp, 
      score,
      talkRatio,
      objectionsHandled,
      ctaUsed,
      sentiment,
      feedback,
      duration,
      audioUrl,
      audioDuration,
      audioFileSize
    } = body;

    // Validate required fields
    if (!transcript || !Array.isArray(transcript)) {
      return errorResponse('transcript is required and must be an array');
    }

    if (!repId) {
      return errorResponse('repId is required');
    }

    if (!scenarioName) {
      return errorResponse('scenarioName is required');
    }

    // Prepare data for insertion
    const callData = {
      rep_id: repId,
      scenario_name: scenarioName,
      transcript: transcript,
      score: score || 0,
      talk_ratio: talkRatio || 0,
      objections_handled: objectionsHandled || 0,
      cta_used: ctaUsed || false,
      sentiment: sentiment || 'neutral',
      feedback: feedback || [],
      duration: duration || transcript.length * 30, // Estimate if not provided
      audio_url: audioUrl || null,
      audio_duration: audioDuration || null,
      audio_file_size: audioFileSize || null,
      created_at: timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('calls')
      .insert([callData])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({
      success: true,
      callId: data.id,
      message: 'Call transcript saved successfully'
    }, 201, corsHeaders);

  } catch (error) {
    console.error('Save transcript error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 