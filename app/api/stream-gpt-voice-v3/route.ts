import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

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
    console.error('Failed to initialize ElevenLabs client:', error);
    throw error;
  }
}

// Helper functions for behavioral modifiers
function getDifficultyModifier(difficulty: number): string {
  const modifiers = {
    1: "You are very cooperative and eager to share information. You're interested in solutions and rarely object.",
    2: "You are somewhat cooperative but need good questions to open up. You have some concerns but are willing to listen.",
    3: "You are moderately cooperative. You share information when asked directly and have realistic concerns about new solutions.",
    4: "You are somewhat guarded and skeptical. You need convincing before sharing sensitive information and raise multiple objections.",
    5: "You are very guarded and skeptical. You're protective of information and frequently challenge claims with strong objections."
  };
  return `COOPERATION LEVEL: ${modifiers[difficulty as keyof typeof modifiers] || modifiers[3]}`;
}

function getSeniorityModifier(seniority: string): string {
  const modifiers = {
    'junior': "You are early in your career. You're eager but often need to check with your manager on decisions. You focus on day-to-day operational concerns.",
    'manager': "You manage a team and handle tactical decisions. You think about team productivity and departmental goals. You can recommend purchases but may need approval for large expenditures.",
    'director': "You oversee multiple teams or a department. You think strategically about business impact and ROI. You have significant decision-making authority but consider how initiatives align with company goals.",
    'vp': "You're a senior executive focused on strategic initiatives and business transformation. You think about competitive advantage and market position. Your time is very limited and valuable.",
    'c-level': "You're an executive focused on company-wide strategy, market positioning, and shareholder value. You think in terms of business transformation and competitive differentiation. You have ultimate decision-making authority but limited time."
  };
  return `SENIORITY BEHAVIOR: ${modifiers[seniority as keyof typeof modifiers] || modifiers['manager']}`;
}

function getCallTypeModifier(callType: string): string {
  const modifiers = {
    'inbound': "You reached out or expressed interest, so you're somewhat receptive but still need to be convinced of value.",
    'outbound': "This is a cold call or unexpected contact. You're busy and need to be quickly convinced this is worth your time.",
    'referral': "You were referred by someone you trust, so you're more open to the conversation but still need to see value.",
    'follow-up': "You've spoken before and have some context. You remember previous conversations and expect progression."
  };
  return `CALL CONTEXT: ${modifiers[callType as keyof typeof modifiers] || modifiers['outbound']}`;
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
      conversationHistory = []
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

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Validate required environment variables
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }

          // Convert conversation history roles to OpenAI format and limit to last 4 exchanges
          const limitedHistory = conversationHistory.slice(-8); // Keep only last 4 exchanges (8 messages)
          const convertedHistory = limitedHistory.map((msg: any) => ({
            role: msg.role === 'rep' || msg.role === 'user' ? 'user' : msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : msg.role,
            content: msg.content
          }));

          // Build conversation context with user scenario as primary prompt
          const buildSystemPrompt = () => {
            // Parse additional parameters for behavioral modifiers
            const { difficulty = 3, seniority = 'manager', callType = 'outbound' } = persona || {};
            
            // Behavioral modifiers based on parameters
            const difficultyModifier = getDifficultyModifier(difficulty);
            const seniorityModifier = getSeniorityModifier(seniority);
            const callTypeModifier = getCallTypeModifier(callType);
            
            return `${scenarioPrompt}

${difficultyModifier}

${seniorityModifier}

${callTypeModifier}

IMPORTANT: You are the PROSPECT/CUSTOMER in this sales conversation, not the salesperson. Respond naturally as the person described in the scenario above. Stay in character and respond to what the sales rep says to you.`;
          };

          const messages = [
            {
              role: 'system' as const,
              content: buildSystemPrompt()
            },
            ...convertedHistory,
            {
              role: 'user' as const,
              content: `Latest rep message: ${transcript}`
            }
          ];

          console.log('Sending request to OpenAI with messages:', JSON.stringify(messages, null, 2));
          
          // Generate AI response using GPT-4o with streaming
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            max_tokens: 300, // Allow for natural conversation length
            temperature: 0.8, // Natural variation while maintaining consistency
            stream: true,
            presence_penalty: 0.3, // Encourage diverse responses
            frequency_penalty: 0.2, // Prevent repetitive patterns
          });
          
          console.log('OpenAI streaming response received');

          let fullResponse = '';
          let currentSentence = '';
          let sentenceCount = 0;

          // Log the full response at the end
          const logFullResponse = () => {
            console.log('FULL AI RESPONSE:', fullResponse);
            console.log('RESPONSE LENGTH:', fullResponse.length);
          };

          // Process streaming response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              currentSentence += content;

              // Allow natural conversation flow - prospects can ask clarifying questions

              // Check if we have a complete sentence or phrase
              const sentenceEndings = ['.', '!', '?', ':', ';'];
              const hasSentenceEnd = sentenceEndings.some(ending => currentSentence.includes(ending));
              const isLongEnough = currentSentence.length > 30; // Allow for more natural chunk sizes
              const hasNaturalPause = currentSentence.includes(',') && currentSentence.length > 20; // Natural pauses

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
                    console.log('Generating voice for chunk:', sentenceCount, 'Text:', currentSentence.trim());
                    
                    const voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
                    
                    // Only try ElevenLabs if API key is available
                    if (process.env.ELEVENLABS_API_KEY) {
                      const elevenlabsClient = await getElevenLabsClient();
                      
                      const textToSpeech = currentSentence.trim();
                      
                      const audioResult = await elevenlabsClient.textToSpeech({
                        fileName: `chunk_${sentenceCount}.mp3`,
                        textInput: textToSpeech,
                        voiceId: voiceId,
                        stability: voiceSettings.stability || 0.5,
                        similarityBoost: voiceSettings.similarityBoost || 0.5,
                        style: voiceSettings.style || 0.0,
                        useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
                      });

                      if (audioResult.status === 'ok') {
                        // Read the generated audio file
                        const fs = require('fs');
                        const audioBuffer = fs.readFileSync(`chunk_${sentenceCount}.mp3`);
                        
                        // Convert audio buffer to base64
                        const audioBase64 = audioBuffer.toString('base64');
                        
                        const audioData = {
                          type: 'audio_chunk',
                          audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
                          chunkId: sentenceCount,
                          text: currentSentence.trim()
                        };

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                        
                        // Clean up the temporary file
                        try {
                          fs.unlinkSync(`chunk_${sentenceCount}.mp3`);
                        } catch (cleanupError) {
                          console.warn('Failed to cleanup audio file:', cleanupError);
                        }
                      }
                    } else {
                      throw new Error('No ElevenLabs API key configured');
                    }
                  } catch (voiceError) {
                    console.error('Voice generation failed for chunk:', sentenceCount, voiceError);
                    
                    // Send fallback audio chunk with speech synthesis flag
                    const fallbackAudioData = {
                      type: 'audio_chunk',
                      audioUrl: null, // No audio URL - will use speech synthesis
                      chunkId: sentenceCount,
                      text: currentSentence.trim(),
                      useSpeechSynthesis: true, // Explicitly flag for speech synthesis
                      fallbackReason: 'api_error'
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
                const voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
                
                if (process.env.ELEVENLABS_API_KEY) {
                  const elevenlabsClient = await getElevenLabsClient();
                  
                  const audioResult = await elevenlabsClient.textToSpeech({
                    fileName: `final_chunk_${sentenceCount}.mp3`,
                    textInput: currentSentence.trim(),
                    voiceId: voiceId,
                    stability: voiceSettings.stability || 0.5,
                    similarityBoost: voiceSettings.similarityBoost || 0.5,
                    style: voiceSettings.style || 0.0,
                    useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
                  });

                  if (audioResult.status === 'ok') {
                    const fs = require('fs');
                    const audioBuffer = fs.readFileSync(`final_chunk_${sentenceCount}.mp3`);
                    
                    const audioBase64 = audioBuffer.toString('base64');
                    const audioData = {
                      type: 'audio_chunk',
                      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
                      chunkId: sentenceCount,
                      text: currentSentence.trim()
                    };

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                    
                    try {
                      fs.unlinkSync(`final_chunk_${sentenceCount}.mp3`);
                    } catch (cleanupError) {
                      console.warn('Failed to cleanup final audio file:', cleanupError);
                    }
                  }
                }
              } catch (voiceError) {
                console.error('Voice generation failed for final chunk:', voiceError);
                
                const fallbackAudioData = {
                  type: 'audio_chunk',
                  audioUrl: null,
                  chunkId: sentenceCount,
                  text: currentSentence.trim(),
                  useSpeechSynthesis: true,
                  fallbackReason: 'api_error'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
              }
            }
          }

          // Log the full response for debugging
          logFullResponse();

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
          console.error('Streaming error:', error);
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
    console.error('Stream GPT voice error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}