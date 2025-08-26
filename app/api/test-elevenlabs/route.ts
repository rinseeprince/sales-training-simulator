import { NextRequest, NextResponse } from 'next/server';
import { generateGoogleTTSAudio } from '@/lib/google-tts';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Check environment variables
    if (!process.env.GOOGLE_TTS_CLIENT_EMAIL || !process.env.GOOGLE_TTS_PRIVATE_KEY) {
      return errorResponse('Google TTS credentials not configured. Please check GOOGLE_TTS_CLIENT_EMAIL and GOOGLE_TTS_PRIVATE_KEY environment variables.');
    }

    console.log('Testing Google TTS with project ID:', process.env.GOOGLE_TTS_PROJECT_ID);

    // Test voice generation with ElevenLabs-compatible settings
    try {
      const testText = "Hello, this is a test of Google Text-to-Speech replacing ElevenLabs. The migration should be seamless with high quality voice output.";
      console.log('Testing voice generation with text:', testText);
      
      // Use the same voice settings format as ElevenLabs for compatibility testing
      const testVoiceSettings = {
        voiceId: '21m00Tcm4TlvDq8ikWAM', // This will be mapped to Google voice
        model_id: 'eleven_turbo_v2',
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true,
      };
      
      const result = await generateGoogleTTSAudio(testText, testVoiceSettings);

      if (result.success) {
        return successResponse({
          success: true,
          message: 'Google TTS test successful - ElevenLabs replacement working',
          audioBase64: result.audioBase64,
          audioBufferLength: result.audioBase64?.length || 0,
          voiceSettingsUsed: testVoiceSettings,
          provider: 'Google Cloud Text-to-Speech',
          compatibility: 'ElevenLabs API compatible'
        });
      } else {
        return errorResponse(`Google TTS test failed: ${result.error}`);
      }

    } catch (voiceError) {
      console.error('Voice generation test failed:', voiceError);
      return errorResponse(`Voice generation test failed: ${voiceError instanceof Error ? voiceError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Google TTS test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 