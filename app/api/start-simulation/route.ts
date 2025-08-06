import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import ElevenLabs from 'elevenlabs-node';

// Initialize ElevenLabs client dynamically
let elevenlabs: any = null;

async function getElevenLabsClient() {
  if (!elevenlabs) {
    const { default: ElevenLabs } = await import('elevenlabs-node');
    elevenlabs = new ElevenLabs(process.env.ELEVENLABS_API_KEY || '');
  }
  return elevenlabs;
}

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

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
    if (voiceSettings && process.env.ELEVENLABS_API_KEY) {
      try {
        const voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
        const elevenlabsClient = await getElevenLabsClient();
        
        const audio = await elevenlabsClient.textToSpeech({
          text: aiResponse,
          voiceId: voiceId,
          stability: voiceSettings.stability || 0.5,
          similarityBoost: voiceSettings.similarityBoost || 0.5,
          style: voiceSettings.style || 0.0,
          useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
        });

        // Convert audio buffer to base64 or store in cloud storage
        // For now, we'll return the audio as base64
        const audioBase64 = Buffer.from(audio).toString('base64');
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
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

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 