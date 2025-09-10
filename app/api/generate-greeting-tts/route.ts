import { NextRequest, NextResponse } from 'next/server';
import { generateGoogleTTSAudio } from '@/lib/google-tts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceSettings } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('Generating greeting TTS for:', text);

    // Generate TTS audio using Google TTS
    const result = await generateGoogleTTSAudio(text, voiceSettings);

    if (result.success) {
      return NextResponse.json({
        success: true,
        audioBase64: result.audioBase64
      });
    } else {
      console.error('Google TTS generation failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'TTS generation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Greeting TTS API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}