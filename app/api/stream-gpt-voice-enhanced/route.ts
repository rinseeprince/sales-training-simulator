import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, validateStreamingEnvVars, corsHeaders, handleCors, openai } from '@/lib/api-utils';
import { generateGoogleTTSAudio } from '@/lib/google-tts';
import { AIProspectEngine } from '@/lib/ai-engine/core/prospect-engine';
import { 
  AIProspectConfig, 
  PersonaConfig, 
  BusinessContext, 
  ProductContext,
  ScenarioContext 
} from '@/lib/ai-engine/types/prospect-types';
import { getConversationStateManager } from '@/lib/conversation-state-manager';

// Helper to extract conversation ID from request
function getConversationId(callId: string | null, conversationHistory: any[]): string {
  // For push-to-talk, use callId if available, otherwise generate one
  if (callId) {
    return callId;
  }
  // Fallback: Use a combination of conversation history length and timestamp
  const historyHash = conversationHistory.length.toString();
  return `conv_${Date.now()}_${historyHash}`;
}

// Helper to parse scenario prompt into structured configuration
function parseScenarioToConfig(scenarioPrompt: string, persona: any = {}): ScenarioContext {
  // Default business context
  const defaultBusiness: BusinessContext = {
    companyName: "TechCorp Industries",
    industry: "Technology",
    companySize: "500-1000 employees",
    currentChallenges: ["operational efficiency", "cost reduction", "digital transformation"],
    existingSolutions: ["legacy systems", "manual processes"],
    budgetRange: "$50K-500K",
    decisionTimeframe: "3-6 months"
  };

  // Default product context
  const defaultProduct: ProductContext = {
    productName: "Business Solution",
    category: "Software/Service",
    valuePropositions: ["increased efficiency", "cost savings", "improved workflow"],
    keyFeatures: ["automation", "integration", "analytics"],
    competitiveAdvantages: ["ease of use", "proven ROI", "excellent support"]
  };

  // Extract persona configuration from parameters
  const personaConfig: PersonaConfig = {
    level: persona.seniority || 'manager',
    title: persona.title,
    department: persona.department || 'Operations',
    yearsInRole: persona.yearsInRole || 3,
    personalityTraits: persona.personalityTraits || ['analytical', 'cautious'],
    communicationStyle: persona.communicationStyle || 'professional',
    decisionMakingAuthority: persona.decisionMakingAuthority || 'recommender',
    priorities: persona.priorities || ['efficiency', 'cost-effectiveness'],
    painPoints: persona.painPoints || ['time constraints', 'budget limitations'],
    objectionStyle: persona.objectionStyle || 'logical'
  };

  return {
    businessContext: defaultBusiness,
    productContext: defaultProduct,
    personaConfig,
    callType: persona.callType || 'discovery-outbound',
    difficulty: persona.difficulty || 3,
    specificObjections: persona.specificObjections || [],
    hiddenNeeds: persona.hiddenNeeds || []
  };
}

// Smart model selection for human-like responses
function selectOptimalModel(conversationHistory: any[], messageContent: string): string {
  // Simple criteria focused on generating human-like responses
  const historyLength = conversationHistory.length;
  const messageLength = messageContent.length;
  
  // Use GPT-4o for:
  // 1. Longer, more complex messages that need nuanced responses
  // 2. When conversation has depth (more exchanges)
  // 3. When dealing with objections or closing scenarios
  
  const hasObjections = ['but', 'however', 'concern', 'worry', 'issue', 'problem', 'not sure', 'hesitant', 'expensive', 'budget', 'no', 'not interested'].some(word => 
    messageContent.toLowerCase().includes(word)
  );
  
  const hasClosing = ['next step', 'meeting', 'demo', 'trial', 'proposal', 'contract', 'sign up', 'move forward', 'decision', 'think about it'].some(phrase => 
    messageContent.toLowerCase().includes(phrase)
  );
  
  // Use GPT-4o for more human-like responses in these scenarios
  const useGPT4o = messageLength > 100 || historyLength > 6 || hasObjections || hasClosing;
  
  const selectedModel = useGPT4o ? 'gpt-4o' : 'gpt-4o-mini';
  
  console.log('Model selection for human-like responses:', {
    historyLength,
    messageLength,
    hasObjections,
    hasClosing,
    selectedModel: selectedModel,
    reason: useGPT4o ? 'Complex/nuanced response needed' : 'Simple response sufficient'
  });
  
  return selectedModel;
}

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
      persona = {},
      voiceSettings,
      conversationHistory = [],
      callId // Add callId for conversation persistence
    } = body;

    // Validate required fields
    if (!transcript || !scenarioPrompt) {
      return errorResponse('transcript and scenarioPrompt are required');
    }

    // Don't respond to very short or unclear messages
    const cleanTranscript = transcript.trim();
    if (cleanTranscript.length < 3) {
      console.log('Transcript too short, not responding:', cleanTranscript);
      return new NextResponse(null, { status: 204 });
    }

    // Get or create conversation ID - for push-to-talk, callId should always be provided
    const conversationId = getConversationId(callId, conversationHistory);
    console.log('Processing push-to-talk conversation:', conversationId);

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // SIMPLIFIED APPROACH: Use your scenario prompt directly like the original system
          console.log('Using direct scenario prompt approach for ChatGPT-like behavior');
          console.log('User scenario prompt:', scenarioPrompt);

          // Select optimal model for human-like responses
          const selectedModel = selectOptimalModel(conversationHistory, cleanTranscript);
          
          console.log('Generating AI prospect response using direct prompt approach');
          console.log('Rep message:', cleanTranscript);
          console.log('Selected model for this response:', selectedModel);
          
          // Build system prompt using user's scenario directly (like original system)
          const systemPrompt = `${scenarioPrompt}

IMPORTANT: You are the PROSPECT/CUSTOMER in this sales conversation, not the salesperson. Respond naturally as the person described in the scenario above. Stay in character and respond to what the sales rep says to you.

Keep your responses natural and conversational (1-3 sentences). Show personality and human reactions.`;

          // Convert conversation history to OpenAI format
          const convertedHistory = conversationHistory.slice(-8).map((msg: any) => ({
            role: msg.role === 'rep' || msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));

          const messages = [
            { role: 'system' as const, content: systemPrompt },
            ...convertedHistory,
            { role: 'user' as const, content: `Latest rep message: ${cleanTranscript}` }
          ];

          console.log('Sending request to OpenAI with user scenario:', {
            model: selectedModel,
            systemPromptPreview: systemPrompt.substring(0, 100) + '...',
            historyLength: convertedHistory.length
          });
          
          // Generate AI response using selected model with user's prompt
          const completion = await openai.chat.completions.create({
            model: selectedModel,
            messages,
            max_tokens: selectedModel === 'gpt-4o' ? 300 : 150,
            temperature: 0.8,
            stream: true,
            presence_penalty: 0.3,
            frequency_penalty: 0.2,
          });
          
          console.log('OpenAI streaming response received with user scenario');

          let fullResponse = '';
          let currentSentence = '';
          let sentenceCount = 0;

          // Process streaming response (same as before)
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              currentSentence += content;

              // Check if we have a complete sentence or phrase
              const sentenceEndings = ['.', '!', '?', ':', ';'];
              const hasSentenceEnd = sentenceEndings.some(ending => currentSentence.includes(ending));
              const isLongEnough = currentSentence.length > 30;
              const hasNaturalPause = currentSentence.includes(',') && currentSentence.length > 20;

              if (hasSentenceEnd || isLongEnough || hasNaturalPause) {
                sentenceCount++;
                
                // Send the sentence chunk to frontend
                const chunkData = {
                  type: 'text_chunk',
                  content: currentSentence.trim(),
                  chunkId: sentenceCount,
                  isComplete: hasSentenceEnd
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));

                // Generate audio for this chunk if voice settings are provided
                if (voiceSettings) {
                  try {
                    console.log('Generating Google TTS voice for chunk:', sentenceCount);
                    
                    const textToSpeech = currentSentence.trim();
                    const result = await generateGoogleTTSAudio(textToSpeech, voiceSettings);
                    
                    if (result.success && result.audioBase64) {
                      const audioData = {
                        type: 'audio_chunk',
                        audioUrl: `data:audio/mpeg;base64,${result.audioBase64}`,
                        chunkId: sentenceCount,
                        text: textToSpeech,
                        isComplete: true
                      };

                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                    } else {
                      throw new Error(result.error || 'Google TTS generation failed');
                    }
                  } catch (voiceError) {
                    console.error('Google TTS voice generation failed for chunk:', sentenceCount, voiceError);
                    
                    const fallbackAudioData = {
                      type: 'audio_chunk',
                      audioUrl: null,
                      chunkId: sentenceCount,
                      text: currentSentence.trim(),
                      useSpeechSynthesis: true,
                      fallbackReason: 'google_tts_error'
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
                  }
                }

                // Reset current sentence
                currentSentence = '';
              }
            }
          }

          // Handle any remaining content
          if (currentSentence.trim()) {
            sentenceCount++;
            const chunkData = {
              type: 'text_chunk',
              content: currentSentence.trim(),
              chunkId: sentenceCount,
              isComplete: true
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));

            // Generate audio for final chunk
            if (voiceSettings) {
              try {
                console.log('Generating Google TTS voice for final chunk:', sentenceCount);
                
                const result = await generateGoogleTTSAudio(currentSentence.trim(), voiceSettings);
                
                if (result.success && result.audioBase64) {
                  const audioData = {
                    type: 'audio_chunk',
                    audioUrl: `data:audio/mpeg;base64,${result.audioBase64}`,
                    chunkId: sentenceCount,
                    text: currentSentence.trim(),
                    isComplete: true
                  };

                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                } else {
                  throw new Error(result.error || 'Google TTS final chunk generation failed');
                }
              } catch (voiceError) {
                console.error('Google TTS voice generation failed for final chunk:', voiceError);
                
                const fallbackAudioData = {
                  type: 'audio_chunk',
                  audioUrl: null,
                  chunkId: sentenceCount,
                  text: currentSentence.trim(),
                  useSpeechSynthesis: true,
                  fallbackReason: 'google_tts_error'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
              }
            }
          }

          console.log('FULL AI RESPONSE using user scenario:', fullResponse);

          // Send completion signal
          const completionData = {
            type: 'completion',
            fullResponse: fullResponse.trim(),
            totalChunks: sentenceCount,
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
          
          controller.close();

        } catch (error) {
          console.error('Enhanced streaming error:', error);
          const errorData = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Streaming failed'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
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
    console.error('Enhanced stream GPT voice error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

// Conversation cleanup is now handled by ConversationStateManager

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}