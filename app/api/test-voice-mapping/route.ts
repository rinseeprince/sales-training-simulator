import { NextRequest } from 'next/server';
import { generateGoogleTTSAudio } from '@/lib/google-tts';
import { successResponse, errorResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const testText = "Hello! I'm excited to discuss how our solution can help your business grow and achieve its goals.";
    
    // Test all voice mappings
    const voiceMappings = [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Professional Male' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Professional Female' },
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Executive Male' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Executive Female' },
      { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Casual Male' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Casual Female' },
    ];

    const results = [];

    console.log('Starting voice mapping test...');

    for (const voice of voiceMappings) {
      try {
        const voiceSettings = {
          voiceId: voice.id,
          stability: 0.5,
          similarityBoost: 0.5,
          style: 0.0,
          useSpeakerBoost: true
        };

        console.log(`Testing voice: ${voice.name} (${voice.id})`);
        const result = await generateGoogleTTSAudio(testText, voiceSettings);

        results.push({
          voiceId: voice.id,
          voiceName: voice.name,
          success: result.success,
          audioLength: result.audioBase64?.length || 0,
          error: result.error || null
        });

        console.log(`✅ ${voice.name}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
      } catch (error) {
        console.error(`❌ ${voice.name} failed:`, error);
        results.push({
          voiceId: voice.id,
          voiceName: voice.name,
          success: false,
          audioLength: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return successResponse({
      success: true,
      message: `Voice mapping test completed: ${successCount}/${totalCount} voices working`,
      testText: testText,
      results: results,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Voice mapping test error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}
