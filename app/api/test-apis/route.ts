import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import ElevenLabs from 'elevenlabs-node';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const results = {
      openai: false,
      elevenlabs: false,
      environment: false,
      message: ''
    };

    // Test environment variables
    try {
      validateStreamingEnvVars();
      results.environment = true;
    } catch (error) {
      results.message = `Environment error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return successResponse(results, 200, corsHeaders);
    }

    // Test OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10,
      });
      results.openai = true;
    } catch (error) {
      results.message = `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return successResponse(results, 200, corsHeaders);
    }

    // Test ElevenLabs
    try {
      // Use dynamic import to avoid bundling issues
      const { default: ElevenLabs } = await import('elevenlabs-node');
      const elevenlabs = new ElevenLabs(process.env.ELEVENLABS_API_KEY || '');
      const audio = await elevenlabs.textToSpeech({
        text: 'Hello',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        model_id: 'eleven_turbo_v2',
      });
      results.elevenlabs = true;
    } catch (error) {
      results.message = `ElevenLabs error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return successResponse(results, 200, corsHeaders);
    }

    results.message = 'All APIs working correctly!';
    return successResponse(results, 200, corsHeaders);

  } catch (error) {
    console.error('API test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 