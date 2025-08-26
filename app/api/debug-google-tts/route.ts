import { NextRequest } from 'next/server';
import { successResponse, errorResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Check environment variables (without exposing sensitive data)
    const envCheck = {
      hasProjectId: !!process.env.GOOGLE_TTS_PROJECT_ID,
      hasClientEmail: !!process.env.GOOGLE_TTS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_TTS_PRIVATE_KEY,
      projectId: process.env.GOOGLE_TTS_PROJECT_ID,
      clientEmail: process.env.GOOGLE_TTS_CLIENT_EMAIL,
      privateKeyLength: process.env.GOOGLE_TTS_PRIVATE_KEY?.length || 0,
      privateKeyStartsWith: process.env.GOOGLE_TTS_PRIVATE_KEY?.substring(0, 30) || 'not-set',
      privateKeyEndsWith: process.env.GOOGLE_TTS_PRIVATE_KEY?.substring(-30) || 'not-set',
      hasQuotes: process.env.GOOGLE_TTS_PRIVATE_KEY?.startsWith('"') || false,
    };

    // Test Google TTS client initialization
    let clientTest = { success: false, error: null, details: null };
    try {
      const { TextToSpeechClient } = await import('@google-cloud/text-to-speech');
      
      // Clean the private key - remove quotes if present
      let privateKey = process.env.GOOGLE_TTS_PRIVATE_KEY || '';
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      const client = new TextToSpeechClient({
        credentials: {
          client_email: process.env.GOOGLE_TTS_CLIENT_EMAIL,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
        projectId: process.env.GOOGLE_TTS_PROJECT_ID,
      });
      
      // Test a simple API call
      const [response] = await client.listVoices({});
      clientTest = { 
        success: true, 
        error: null, 
        voiceCount: response.voices?.length || 0,
        details: 'Client initialized and API call successful'
      };
    } catch (error) {
      clientTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        details: error instanceof Error ? error.stack : 'No stack trace'
      };
    }

    // Test the actual generateGoogleTTSAudio function
    let functionTest = { success: false, error: null };
    try {
      const { generateGoogleTTSAudio } = await import('@/lib/google-tts');
      
      const testVoiceSettings = {
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true
      };
      
      const result = await generateGoogleTTSAudio("Test message", testVoiceSettings);
      functionTest = { 
        success: result.success, 
        error: result.error || null,
        fallbackReason: result.fallbackReason || null
      };
    } catch (error) {
      functionTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return successResponse({
      message: 'Google TTS Debug Information',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      clientTest: clientTest,
      functionTest: functionTest,
      recommendations: getRecommendations(envCheck, clientTest, functionTest)
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Google TTS debug error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

function getRecommendations(envCheck: any, clientTest: any, functionTest: any) {
  const recommendations = [];
  
  if (!envCheck.hasProjectId) {
    recommendations.push('❌ GOOGLE_TTS_PROJECT_ID is missing');
  }
  if (!envCheck.hasClientEmail) {
    recommendations.push('❌ GOOGLE_TTS_CLIENT_EMAIL is missing');
  }
  if (!envCheck.hasPrivateKey) {
    recommendations.push('❌ GOOGLE_TTS_PRIVATE_KEY is missing');
  }
  
  if (envCheck.hasQuotes) {
    recommendations.push('⚠️ Private key has quotation marks - remove them from the environment variable');
  }
  
  if (envCheck.hasPrivateKey && !envCheck.privateKeyStartsWith.includes('-----BEGIN')) {
    recommendations.push('⚠️ Private key may not be properly formatted - should start with "-----BEGIN PRIVATE KEY-----"');
  }
  
  if (clientTest.error) {
    if (clientTest.error.includes('INVALID_ARGUMENT')) {
      recommendations.push('❌ Invalid credentials or project ID');
    } else if (clientTest.error.includes('PERMISSION_DENIED')) {
      recommendations.push('❌ Service account lacks Text-to-Speech API permissions');
    } else if (clientTest.error.includes('UNAUTHENTICATED')) {
      recommendations.push('❌ Authentication failed - check credentials');
    } else {
      recommendations.push(`❌ Client error: ${clientTest.error}`);
    }
  }
  
  if (functionTest.error) {
    recommendations.push(`❌ Function test failed: ${functionTest.error}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All checks passed - Google TTS should work');
  }
  
  return recommendations;
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}
