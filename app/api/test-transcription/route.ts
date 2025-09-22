import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    console.log('Test transcription request:', {
      hasAudioFile: !!audioFile,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.type,
      language
    });

    if (!audioFile) {
      return errorResponse('Audio file is required');
    }

    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return errorResponse('File must be an audio file');
    }

    // For testing, return a mock transcription based on audio file size
    // This simulates different transcriptions for different audio inputs
    const mockTexts = [
      "Hello, I'm calling about your project management needs.",
      "We're looking for a solution to improve our team collaboration.",
      "Can you tell me more about your pricing structure?",
      "What kind of support do you provide?",
      "How long does implementation typically take?",
      "Do you offer a free trial?",
      "What makes your solution different from competitors?",
      "Can you walk me through the demo process?",
      "What's included in the basic package?",
      "How do you handle data security?"
    ];
    
    const textIndex = Math.floor((audioFile.size % mockTexts.length));
    const mockTranscription = {
      text: mockTexts[textIndex],
      confidence: 0.85 + (Math.random() * 0.1), // Random confidence between 0.85-0.95
      language: language,
      duration: 2.0 + (Math.random() * 3.0), // Random duration between 2-5 seconds
      timestamp: new Date().toISOString(),
    };

    console.log('Returning mock transcription:', mockTranscription);

    return successResponse(mockTranscription, 200, corsHeaders);

  } catch (error) {
    console.error('Test transcription error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 