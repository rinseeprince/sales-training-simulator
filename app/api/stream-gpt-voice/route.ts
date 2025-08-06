import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

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
      console.log('Creating ElevenLabs client with API key:', apiKey.substring(0, 10) + '...');
      // Use the ElevenLabs constructor correctly
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
      persona, 
      voiceSettings,
      conversationHistory = []
    } = body;

              // Validate required fields
          if (!transcript || !scenarioPrompt) {
            return errorResponse('transcript and scenarioPrompt are required');
          }

          // Don't respond to very short or unclear messages
          const cleanTranscript = transcript.trim();
          if (cleanTranscript.length < 5) {
            console.log('Transcript too short, not responding:', cleanTranscript);
            return;
          }

          // Check if the user is asking a question (ends with ? or starts with question words)
          const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 'would you', 'do you', 'are you'];
          const isQuestion = cleanTranscript.includes('?') || questionWords.some(word => cleanTranscript.toLowerCase().startsWith(word));
          
          if (isQuestion) {
            console.log('User asked a question, ensuring AI provides a direct answer');
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
          
          if (!process.env.ELEVENLABS_API_KEY) {
            throw new Error('ElevenLabs API key is not configured');
          }

          // Convert conversation history roles to OpenAI format and limit to last 4 exchanges
          const limitedHistory = conversationHistory.slice(-8); // Keep only last 4 exchanges (8 messages)
          const convertedHistory = limitedHistory.map((msg: any) => ({
            role: msg.role === 'rep' || msg.role === 'user' ? 'user' : msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : msg.role,
            content: msg.content
          }));

          console.log('Limited conversation history being sent:', convertedHistory);
          console.log('Current transcript:', transcript);

          // Build conversation context
          const messages = [
            {
              role: 'system' as const,
              content: `You are a prospect in a sales call. The sales rep is asking YOU questions. You answer them.

CRITICAL RULES:
1. You are the CUSTOMER, not the salesperson
2. You ANSWER questions, you don't ask them
3. Keep responses short (1-2 sentences max)
4. Be direct and honest
5. Don't ask the sales rep questions
6. Don't try to sell anything

Example responses:
- "We're a mid-size tech company with about 200 employees."
- "Our biggest challenge is slow customer support response times."
- "We have about $30K budgeted for this quarter."
- "I'm the IT manager, but the VP makes final decisions."

Scenario: ${scenarioPrompt}`
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
            max_tokens: 60, // Even shorter responses to prevent monologuing
            temperature: 0.9, // More natural variation in responses
            stream: true,
            presence_penalty: 0.1, // Slightly discourage repetition
            frequency_penalty: 0.1, // Slightly discourage repetitive phrases
          });
          
          console.log('OpenAI streaming response received');

          let fullResponse = '';
          let currentSentence = '';
          let sentenceCount = 0;

          // Log the full response at the end
          const logFullResponse = () => {
            console.log('FULL AI RESPONSE:', fullResponse);
            console.log('RESPONSE ANALYSIS:');
            console.log('- Contains question mark:', fullResponse.includes('?'));
            console.log('- Contains question words:', questionWords.some(word => fullResponse.toLowerCase().includes(word)));
            console.log('- Length:', fullResponse.length);
          };

          // Process streaming response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              currentSentence += content;

              // Check if AI is trying to ask a question (which it shouldn't)
              const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 'would you', 'do you', 'are you'];
              const isAskingQuestion = questionWords.some(word => currentSentence.toLowerCase().includes(word)) && currentSentence.includes('?');
              
              if (isAskingQuestion) {
                console.log('WARNING: AI is trying to ask a question, stopping response');
                // Send error and stop
                const errorData = {
                  type: 'error',
                  error: 'AI attempted to ask a question instead of answering'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
                return;
              }

              // Check if we have a complete sentence or phrase
              const sentenceEndings = ['.', '!', '?', ':', ';'];
              const hasSentenceEnd = sentenceEndings.some(ending => currentSentence.includes(ending));
              const isLongEnough = currentSentence.length > 20; // Shorter chunks for more natural flow
              const hasNaturalPause = currentSentence.includes(',') && currentSentence.length > 15; // Natural pauses

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
                // Always try to generate audio, but fallback to speech synthesis if ElevenLabs fails
                if (voiceSettings) {
                  let elevenlabsClient = null;
                  let voiceId = null;
                  let textToSpeech = null;
                  
                  try {
                    console.log('Generating voice for chunk:', sentenceCount, 'Text:', currentSentence.trim());
                    
                    voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
                    console.log('Using voice ID:', voiceId);
                    
                    // Only try ElevenLabs if API key is available
                    if (process.env.ELEVENLABS_API_KEY) {
                      elevenlabsClient = await getElevenLabsClient();
                      console.log('ElevenLabs client obtained successfully');
                    } else {
                      console.log('No ElevenLabs API key, using speech synthesis fallback');
                      throw new Error('No ElevenLabs API key configured');
                    }
                    
                    textToSpeech = currentSentence.trim();
                    console.log('Text to speech:', textToSpeech);
                    
                    console.log('About to call ElevenLabs API with params:', {
                      fileName: `chunk_${sentenceCount}.mp3`,
                      textInput: textToSpeech,
                      voiceId: voiceId,
                      stability: voiceSettings.stability || 0.5,
                      similarityBoost: voiceSettings.similarityBoost || 0.5,
                      style: voiceSettings.style || 0.0,
                      useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
                    });

                    const audioResult = await elevenlabsClient.textToSpeech({
                      fileName: `chunk_${sentenceCount}.mp3`,
                      textInput: textToSpeech,
                      voiceId: voiceId,
                      stability: voiceSettings.stability || 0.5,
                      similarityBoost: voiceSettings.similarityBoost || 0.5,
                      style: voiceSettings.style || 0.0,
                      useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
                    });

                    console.log('Voice generated successfully for chunk:', sentenceCount, 'Result:', audioResult);
                    console.log('AudioResult type:', typeof audioResult);
                    console.log('AudioResult keys:', audioResult ? Object.keys(audioResult) : 'null/undefined');

                    if (audioResult.status !== 'ok') {
                      throw new Error(`ElevenLabs returned status: ${audioResult.status}`);
                    }

                    // Read the generated audio file
                    const fs = require('fs');
                    const audioBuffer = fs.readFileSync(`chunk_${sentenceCount}.mp3`);
                    console.log('Audio file read, buffer length:', audioBuffer.length);

                    // Convert audio buffer to base64
                    const audioBase64 = audioBuffer.toString('base64');
                    console.log('Audio converted to base64, length:', audioBase64.length);
                    
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
                  } catch (voiceError) {
                    console.error('Voice generation failed for chunk:', sentenceCount, voiceError);
                    console.error('Voice error details:', {
                      error: voiceError,
                      message: voiceError instanceof Error ? voiceError.message : 'Unknown error',
                      stack: voiceError instanceof Error ? voiceError.stack : undefined,
                      elevenlabsClient: !!elevenlabsClient,
                      voiceId: voiceId,
                      textToSpeech: textToSpeech
                    });
                    
                    // Check if it's a credits/API limit error
                    const errorMessage = voiceError instanceof Error ? voiceError.message : 'Unknown error';
                    const isCreditsError = errorMessage.includes('credits') || 
                                         errorMessage.includes('quota') || 
                                         errorMessage.includes('limit') ||
                                         errorMessage.includes('insufficient') ||
                                         errorMessage.includes('payment') ||
                                         errorMessage.includes('subscription');
                    
                    if (isCreditsError) {
                      console.log('Detected credits/quota error, using speech synthesis fallback');
                    }
                    
                    // Send fallback audio chunk with speech synthesis flag
                    const fallbackAudioData = {
                      type: 'audio_chunk',
                      audioUrl: null, // No audio URL - will use speech synthesis
                      chunkId: sentenceCount,
                      text: currentSentence.trim(),
                      useSpeechSynthesis: true, // Explicitly flag for speech synthesis
                      fallbackReason: isCreditsError ? 'credits_exhausted' : 'api_error'
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
                    
                    // Also send error notification with more context
                    const errorData = {
                      type: 'voice_error',
                      chunkId: sentenceCount,
                      error: `Voice generation failed: ${errorMessage}`,
                      fallbackToSpeechSynthesis: true,
                      reason: isCreditsError ? 'credits_exhausted' : 'api_error'
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
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
              let elevenlabsClient = null;
              let voiceId = null;
              
              try {
                voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
                // Only try ElevenLabs if API key is available
                if (process.env.ELEVENLABS_API_KEY) {
                  elevenlabsClient = await getElevenLabsClient();
                } else {
                  console.log('No ElevenLabs API key for final chunk, using speech synthesis fallback');
                  throw new Error('No ElevenLabs API key configured');
                }
                
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
                  // Read the generated audio file
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
                  
                  // Clean up the temporary file
                  try {
                    fs.unlinkSync(`final_chunk_${sentenceCount}.mp3`);
                  } catch (cleanupError) {
                    console.warn('Failed to cleanup final audio file:', cleanupError);
                  }
                }
              } catch (voiceError) {
                console.error('Voice generation failed for final chunk:', voiceError);
                
                // Check if it's a credits/API limit error
                const errorMessage = voiceError instanceof Error ? voiceError.message : 'Unknown error';
                const isCreditsError = errorMessage.includes('credits') || 
                                     errorMessage.includes('quota') || 
                                     errorMessage.includes('limit') ||
                                     errorMessage.includes('insufficient') ||
                                     errorMessage.includes('payment') ||
                                     errorMessage.includes('subscription');
                
                if (isCreditsError) {
                  console.log('Detected credits/quota error for final chunk, using speech synthesis fallback');
                }
                
                // Send fallback audio chunk with speech synthesis flag
                const fallbackAudioData = {
                  type: 'audio_chunk',
                  audioUrl: null, // No audio URL - will use speech synthesis
                  chunkId: sentenceCount,
                  text: currentSentence.trim(),
                  useSpeechSynthesis: true, // Explicitly flag for speech synthesis
                  fallbackReason: isCreditsError ? 'credits_exhausted' : 'api_error'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
                
                // Also send error notification with more context
                const errorData = {
                  type: 'voice_error',
                  chunkId: sentenceCount,
                  error: `Voice generation failed: ${errorMessage}`,
                  fallbackToSpeechSynthesis: true,
                  reason: isCreditsError ? 'credits_exhausted' : 'api_error'
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
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