import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Check environment variables
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return errorResponse('ELEVENLABS_API_KEY is not configured');
    }

    console.log('Testing ElevenLabs with API key:', apiKey.substring(0, 10) + '...');

    // Test ElevenLabs import
    let ElevenLabs;
    try {
      const module = await import('elevenlabs-node');
      ElevenLabs = module.default;
      console.log('ElevenLabs import successful');
    } catch (importError) {
      console.error('ElevenLabs import failed:', importError);
      return errorResponse(`ElevenLabs import failed: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
    }

    // Test client creation
    let client;
    try {
      client = new ElevenLabs({
        apiKey: apiKey,
        voiceId: '21m00Tcm4TlvDq8ikWAM'
      });
      console.log('ElevenLabs client created successfully');
    } catch (clientError) {
      console.error('ElevenLabs client creation failed:', clientError);
      return errorResponse(`ElevenLabs client creation failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
    }

    // Test voice generation
    try {
      const testText = "Hello, this is a test of ElevenLabs voice generation.";
      console.log('Testing voice generation with text:', testText);
      
      const result = await client.textToSpeech({
        fileName: 'test_voice.mp3',
        textInput: testText,
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        model_id: 'eleven_turbo_v2',
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true,
      });

      console.log('Voice generation result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', result ? Object.keys(result) : 'null/undefined');

      // Read the generated file
      const fs = require('fs');
      const audioBuffer = fs.readFileSync('test_voice.mp3');
      console.log('Audio file read, buffer length:', audioBuffer.length);

      // Clean up
      fs.unlinkSync('test_voice.mp3');

      return successResponse({
        success: true,
        message: 'ElevenLabs test successful',
        result: result,
        audioBufferLength: audioBuffer.length
      });

    } catch (voiceError) {
      console.error('Voice generation test failed:', voiceError);
      return errorResponse(`Voice generation test failed: ${voiceError instanceof Error ? voiceError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('ElevenLabs test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 