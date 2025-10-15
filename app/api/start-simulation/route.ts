import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { generateGoogleTTSAudio } from '@/lib/google-tts';
import { authenticateWithOrganization } from '@/lib/organization-middleware';
import { authenticateUser } from '@/lib/supabase-auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Check authentication and simulation limits
    const orgAuthRequest = await authenticateWithOrganization(req);
    
    // Use the unified check-simulation-limit endpoint for both org and free users
    const checkLimitResponse = await fetch(new URL('/api/check-simulation-limit', req.url), {
      method: 'GET',
      headers: {
        'authorization': req.headers.get('authorization') || '',
        'cookie': req.headers.get('cookie') || ''
      }
    });
    
    if (checkLimitResponse.ok) {
      const limitData = await checkLimitResponse.json();
      if (!limitData.canSimulate) {
        return errorResponse(limitData.message || 'Simulation limit reached');
      }
    } else {
      return errorResponse('Unable to verify simulation limits. Please try again.');
    }

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { scenarioPrompt, persona, voiceSettings, enableStreaming } = body;

    // Validate required fields
    if (!scenarioPrompt) {
      return errorResponse('scenarioPrompt is required');
    }

    // If streaming is enabled, redirect to streaming endpoint
    if (enableStreaming) {
      return NextResponse.redirect(new URL('/api/stream-gpt-voice', req.url), 307);
    }

    // Generate AI response using GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a ${persona || 'potential customer'} in a sales roleplay scenario. 
          Respond naturally and realistically to the sales representative. 
          Keep responses conversational and appropriate for the scenario: "${scenarioPrompt}".
          
          Guidelines:
          - Stay in character throughout the conversation
          - Ask relevant questions and raise objections when appropriate
          - Be realistic about buying decisions
          - Don't be too easy to convince, but also don't be impossible
          - Keep responses concise (1-3 sentences)`
        },
        {
          role: 'user',
          content: `Scenario: ${scenarioPrompt}\n\nPlease start the conversation as the ${persona || 'customer'}.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Hello, I\'m interested in learning more.';

    let audioUrl = null;

    // Generate voice response if voice settings are provided
    if (voiceSettings && process.env.GOOGLE_TTS_CLIENT_EMAIL) {
      try {
        console.log('Generating Google TTS audio for start simulation...');
        const result = await generateGoogleTTSAudio(aiResponse, voiceSettings);
        
        if (result.success && result.audioBase64) {
          audioUrl = `data:audio/mpeg;base64,${result.audioBase64}`;
          console.log('Voice generation successful for start simulation');
        } else {
          console.error('Google TTS generation failed:', result.error);
          // Continue without voice if it fails
        }
      } catch (voiceError) {
        console.error('Voice generation failed:', voiceError);
        // Continue without voice if it fails
      }
    }

    return successResponse({
      aiResponse,
      audioUrl,
      timestamp: new Date().toISOString(),
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Start simulation error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 