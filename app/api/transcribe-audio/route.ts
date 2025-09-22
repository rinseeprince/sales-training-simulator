import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    // Convert language code to ISO-639-1 format
    const languageMap: { [key: string]: string } = {
      'en': 'en',
      'en-US': 'en',
      'en-us': 'en',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'it': 'it',
      'pt': 'pt',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh'
    };
    
    const isoLanguage = languageMap[language.toLowerCase()] || 'en';

    if (!audioFile) {
      return errorResponse('Audio file is required');
    }

    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return errorResponse('File must be an audio file');
    }

    // Convert file to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], audioFile.name, { type: audioFile.type }),
      model: 'whisper-1',
      language: isoLanguage,
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    return successResponse({
      text: transcription.text,
      confidence: transcription.words?.[0]?.confidence || 0.8,
      language: transcription.language,
      duration: transcription.duration,
      timestamp: new Date().toISOString(),
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Transcription error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Transcription failed',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 