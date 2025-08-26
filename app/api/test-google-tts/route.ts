import { NextRequest } from 'next/server';
import { generateGoogleTTSAudio } from '@/lib/google-tts';
import { successResponse, errorResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const testText = "Hello, this is a test of Google Text-to-Speech. The voice quality should be excellent for sales training simulations. This replaces ElevenLabs seamlessly.";
    
    console.log('Starting Google TTS test...');
    
    // Test with default settings (similar to ElevenLabs defaults)
    const testVoiceSettings = {
      voiceId: '21m00Tcm4TlvDq8ikWAM', // This will be mapped to Google voice
      stability: 0.5,
      similarityBoost: 0.5,
      style: 0.0,
      useSpeakerBoost: true
    };
    
    const result = await generateGoogleTTSAudio(testText, testVoiceSettings);

    if (result.success) {
      return successResponse({
        success: true,
        message: 'Google TTS test successful',
        audioBase64: result.audioBase64,
        audioLength: result.audioBase64?.length || 0,
        testText: testText,
        voiceSettingsUsed: testVoiceSettings,
        provider: 'Google Cloud Text-to-Speech'
      }, 200, corsHeaders);
    } else {
      return errorResponse(`Google TTS test failed: ${result.error}`);
    }

  } catch (error) {
    console.error('Google TTS test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function GET(req: NextRequest) {
  // Simple GET endpoint for quick testing
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    return successResponse({
      message: 'Google TTS test endpoint is ready',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      instructions: 'Send a POST request to test Google TTS audio generation'
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Google TTS health check error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}
