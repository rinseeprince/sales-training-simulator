import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { AIProspectEngine } from '@/lib/ai-engine/core/prospect-engine';
import { BusinessModelParser } from '@/lib/ai-engine/core/business-model-parser';
import { ConversationManager } from '@/lib/ai-engine/core/conversation-manager';
import { PersonaLevel, CallType, DifficultyLevel } from '@/lib/ai-engine/types/prospect-types';

// Initialize ElevenLabs client dynamically
let elevenlabs: any = null;

async function getElevenLabsClient() {
  try {
    if (!elevenlabs) {
      console.log('Initializing ElevenLabs client...');
      const { default: ElevenLabs } = await import('elevenlabs-node');
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not configured');
      }
      elevenlabs = new (ElevenLabs as any)({
        apiKey: apiKey,
        voiceId: '21m00Tcm4TlvDq8ikWAM' // Default voice ID
      });
    }
    return elevenlabs;
  } catch (error) {
    console.error('ElevenLabs initialization error:', error);
    throw error;
  }
}

// Store conversation sessions
const conversationSessions = new Map<string, {
  prospectEngine: AIProspectEngine;
  conversationManager: ConversationManager;
}>();

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateStreamingEnvVars();

    // Parse request body
    const body = await req.json();
    const { 
      transcript, 
      scenarioPrompt,
      sessionId,
      personaLevel = 'manager' as PersonaLevel,
      callType = 'discovery-outbound' as CallType,
      difficulty = 3 as DifficultyLevel,
      voiceSettings,
      conversationHistory = []
    } = body;

    // Validate required fields
    if (!transcript || !scenarioPrompt) {
      return errorResponse('transcript and scenarioPrompt are required');
    }

    // Don't respond to very short messages
    const cleanTranscript = transcript.trim();
    if (cleanTranscript.length < 5) {
      return new NextResponse(null, { status: 204 });
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Get or create session
          let session = conversationSessions.get(sessionId);
          
          if (!session) {
            // Parse scenario to extract business context
            const parser = new BusinessModelParser();
            const parsedScenario = await parser.parseScenario(scenarioPrompt);
            
            // Extract persona hints from scenario
            const personaHints = parser.extractPersonaHints(scenarioPrompt);
            
            // Build scenario context
            const scenarioContext = parser.buildScenarioContext(
              parsedScenario,
              {
                level: personaLevel,
                ...personaHints,
                personalityTraits: personaHints.personalityTraits || ['professional', 'analytical']
              },
              callType,
              difficulty
            );
            
            // Create AI prospect engine
            const prospectEngine = new AIProspectEngine({
              scenarioContext,
              voiceSettings: {
                voiceId: voiceSettings?.voiceId || '21m00Tcm4TlvDq8ikWAM'
              }
            });
            
            // Create conversation manager
            const conversationManager = new ConversationManager(scenarioPrompt);
            
            session = { prospectEngine, conversationManager };
            conversationSessions.set(sessionId, session);
          }
          
          // Add rep's message to conversation
          session.conversationManager.addTurn('rep', cleanTranscript);
          
          // Generate AI prospect response
          const prospectResponse = await session.prospectEngine.generateResponse(cleanTranscript);
          
          // Add AI response to conversation
          session.conversationManager.addTurn('prospect', prospectResponse.message, {
            sentiment: prospectResponse.sentiment,
            emotionalTone: prospectResponse.emotionalTone,
            raisedObjection: prospectResponse.raisedObjection
          });
          
          // Send text chunks
          const words = prospectResponse.message.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = words.slice(0, i + 1).join(' ');
            const data = {
              type: 'text_chunk',
              content: chunk,
              chunkId: i,
              isComplete: i === words.length - 1,
              sentiment: prospectResponse.sentiment,
              emotionalTone: prospectResponse.emotionalTone
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // Generate voice if ElevenLabs is available
          try {
            const client = await getElevenLabsClient();
            
            // Adjust voice settings based on emotional tone
            const voiceParams = {
              voiceId: voiceSettings?.voiceId || '21m00Tcm4TlvDq8ikWAM',
              stability: voiceSettings?.stability || 0.75,
              similarityBoost: voiceSettings?.similarityBoost || 0.75,
              style: voiceSettings?.style || 0.5,
              useSpeakerBoost: voiceSettings?.useSpeakerBoost !== false
            };
            
            // Adjust for emotional tone
            if (prospectResponse.emotionalTone === 'skeptical') {
              voiceParams.stability = 0.85;
              voiceParams.style = 0.3;
            } else if (prospectResponse.emotionalTone === 'enthusiastic') {
              voiceParams.stability = 0.65;
              voiceParams.style = 0.7;
            }
            
            const audioResult = await client.textToSpeech({
              fileName: `ai-response-${Date.now()}.mp3`,
              textInput: prospectResponse.message,
              voiceId: voiceParams.voiceId,
              stability: voiceParams.stability,
              similarityBoost: voiceParams.similarityBoost,
              style: voiceParams.style,
              useSpeakerBoost: voiceParams.useSpeakerBoost,
            });
            
            console.log('Voice generated successfully, result:', audioResult);
            
            if (audioResult.status !== 'ok') {
              throw new Error(`ElevenLabs returned status: ${audioResult.status}`);
            }
            
            // Read the generated audio file
            const fs = require('fs');
            const fileName = `ai-response-${Date.now()}.mp3`;
            const audioBuffer = fs.readFileSync(fileName);
            console.log('Audio file read, buffer length:', audioBuffer.length);
            
            // Convert audio buffer to base64
            const audioBase64 = audioBuffer.toString('base64');
            const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
            
            // Clean up the temporary file
            try {
              fs.unlinkSync(fileName);
            } catch (cleanupError) {
              console.warn('Failed to cleanup audio file:', cleanupError);
            }
            
            // Send audio chunk
            const audioData = {
              type: 'audio_chunk',
              audioUrl,
              chunkId: 0,
              isComplete: true,
              text: prospectResponse.message
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
            
          } catch (voiceError) {
            console.error('Voice generation error:', voiceError);
            console.log('Falling back to speech synthesis');
            
            // Send voice error with speech synthesis fallback
            const fallbackData = {
              type: 'voice_error',
              error: 'Voice generation failed, text response available',
              fallbackToSpeechSynthesis: true,
              text: prospectResponse.message,
              useSpeechSynthesis: true
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackData)}\n\n`));
          }
          
          // Send completion event with conversation analytics
          const analytics = session.conversationManager.getAnalytics();
          const completionData = {
            type: 'completion',
            fullResponse: prospectResponse.message,
            conversationState: session.prospectEngine.getConversationState(),
            analytics: {
              currentPhase: analytics.events[analytics.events.length - 1]?.details?.to || 'discovery',
              rapportLevel: session.prospectEngine.getConversationState().rapportLevel,
              objectionCount: session.prospectEngine.getConversationState().objectionsSurfaced.length,
              keyMoments: analytics.keyMoments.slice(-3) // Last 3 key moments
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
          
        } catch (error) {
          console.error('Stream processing error:', error);
          
          const errorData = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Processing failed'
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Stream GPT voice V2 error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  
  conversationSessions.forEach((session, id) => {
    const context = session.conversationManager.getContext();
    const lastActivity = new Date(context.turns[context.turns.length - 1]?.timestamp || 0).getTime();
    
    if (now - lastActivity > timeout) {
      conversationSessions.delete(id);
    }
  });
}, 5 * 60 * 1000); // Check every 5 minutes