import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    console.log('Testing Supabase storage...');
    
    // Validate environment variables
    validateEnvVars();

    // Test if the call-audio bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return errorResponse(`Failed to list buckets: ${bucketsError.message}`, 500);
    }

    console.log('Available buckets:', buckets);

    const callAudioBucket = buckets?.find(bucket => bucket.id === 'call-audio');
    
    if (!callAudioBucket) {
      return errorResponse('call-audio bucket does not exist. Please run the storage setup script.', 404);
    }

    // Test bucket access by listing files (should be empty)
    const { data: files, error: filesError } = await supabase.storage
      .from('call-audio')
      .list();

    if (filesError) {
      console.error('Error listing files:', filesError);
      return errorResponse(`Failed to list files: ${filesError.message}`, 500);
    }

    console.log('Files in call-audio bucket:', files);

    return successResponse({
      success: true,
      message: 'Storage bucket is accessible',
      bucket: callAudioBucket,
      files: files || [],
      bucketCount: buckets?.length || 0
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Test storage error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 