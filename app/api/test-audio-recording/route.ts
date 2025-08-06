import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // This is just a test endpoint to verify the route is accessible
    // The actual audio recording test needs to be done in the browser
    
    return successResponse({
      success: true,
      message: 'Audio recording test endpoint is accessible',
      instructions: [
        '1. Open browser console',
        '2. Run: navigator.mediaDevices.getUserMedia({ audio: true })',
        '3. Check if it returns a MediaStream',
        '4. Test MediaRecorder API support'
      ],
      browserSupport: {
        mediaDevices: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
        getUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
        MediaRecorder: typeof MediaRecorder !== 'undefined'
      }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Test audio recording error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 