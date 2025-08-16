import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { compileProspectPrompt, serializeHistory, validateProspectReply } from '@/lib/prompt-compiler';
import { AI_CONFIG, LEGACY_MODE } from '@/lib/ai-config';

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

// Keep legacy handler for rollback
async function legacyStreamingHandler(req: NextRequest) {
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

          // Enhanced transcript validation for natural conversation flow
          const cleanTranscript = transcript.trim();
          
          // Don't respond to very short messages
          if (cleanTranscript.length < 4) {
            console.log('Transcript too short, not responding:', cleanTranscript);
            return errorResponse('Transcript too short for meaningful response');
          }
          
          // Filter out fragments and incomplete thoughts
          const isValidTranscript = () => {
            // Check for minimum word count (complete thoughts typically have 2+ words)
            const words = cleanTranscript.split(' ');
            if (words.length < 2) return false;
            
            // Filter out common filler phrases that don't warrant responses
            const fillerPhrases = [
              /^(um|uh|er|ah)$/i,
              /^(hmm|mm|mhm)$/i
            ];
            
            const isJustFiller = fillerPhrases.some(pattern => pattern.test(cleanTranscript));
            if (isJustFiller) return false;
            
            return true;
          };
          
          if (!isValidTranscript()) {
            console.log('Transcript is fragment or filler, not responding:', cleanTranscript);
            return errorResponse('Transcript appears to be incomplete');
          }
          
          console.log('Processing valid transcript:', cleanTranscript);

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

          // Build conversation context with user scenario as primary prompt
          const buildSystemPrompt = () => {
            // Parse additional parameters for behavioral modifiers
            const { difficulty = 3, seniority = 'manager', callType = 'outbound' } = persona || {};
            
            // Behavioral modifiers based on parameters
            const difficultyModifier = getDifficultyModifier(difficulty);
            const seniorityModifier = getSeniorityModifier(seniority);
            const callTypeModifier = getCallTypeModifier(callType);
            
            return `YOU ARE THE PROSPECT/CUSTOMER, NOT THE SALESPERSON.

You are being contacted by a sales representative. Your role is to act as the potential customer/prospect that they are trying to sell to.

SCENARIO CONTEXT:
${scenarioPrompt}

${difficultyModifier}

${seniorityModifier}

${callTypeModifier}

CRITICAL INSTRUCTIONS:
- You are the PROSPECT/CUSTOMER being sold to
- The human user is the SALES REP trying to sell to you
- NEVER act as a salesperson or ask about their business strategies
- Respond as someone who might be interested in THEIR product/service
- Ask questions about what THEY are offering YOU
- Stay in character as the person described in the scenario
- React naturally to their sales pitch

REMEMBER: You are the one being sold to, not the one selling!`;
          };

          const messages = [
            {
              role: 'system' as const,
              content: buildSystemPrompt()
            },
            ...convertedHistory,
            {
              role: 'user' as const,
              content: `The sales representative calling you just said: "${transcript}"

You are the prospect receiving this sales call. Respond naturally as the character described in the scenario.`
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

                    // Fix: Check if audioResult exists and has status property
                    if (!audioResult) {
                      throw new Error('ElevenLabs returned empty response');
                    }
                    
                    // Some ElevenLabs clients might not return a status property
                    if (audioResult.status && audioResult.status !== 'ok') {
                      throw new Error(`ElevenLabs returned status: ${audioResult.status}`);
                    }
                    
                    // Check if the file was actually created
                    const fs = require('fs');
                    if (!fs.existsSync(`chunk_${sentenceCount}.mp3`)) {
                      throw new Error('Audio file was not created by ElevenLabs');
                    }

                    // Read the generated audio file
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

                // Fix: Check if audioResult exists and has valid response
                if (!audioResult) {
                  throw new Error('ElevenLabs returned empty response for final chunk');
                }
                
                // Some ElevenLabs clients might not return a status property
                if (audioResult.status && audioResult.status !== 'ok') {
                  throw new Error(`ElevenLabs returned status for final chunk: ${audioResult.status}`);
                }
                
                // Check if the file was actually created
                const fs = require('fs');
                if (!fs.existsSync(`final_chunk_${sentenceCount}.mp3`)) {
                  throw new Error('Final audio file was not created by ElevenLabs');
                }
                
                // File exists, so we can read it
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

export async function POST(req: NextRequest) {
  if (LEGACY_MODE) {
    // Keep existing logic for rollback
    return legacyStreamingHandler(req);
  }

  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // New compiled-prompt engine
    const body = await req.json();
    const { transcript, scenarioPrompt, persona, conversationHistory = [], voiceSettings, ...context } = body;

    // Validate required fields
    if (!transcript || !scenarioPrompt) {
      return errorResponse('transcript and scenarioPrompt are required');
    }

    // Enhanced transcript validation for natural conversation flow
    const cleanTranscript = transcript.trim();
    
    // Don't respond to very short messages
    if (cleanTranscript.length < 4) {
      console.log('Transcript too short, not responding:', cleanTranscript);
      return errorResponse('Transcript too short for meaningful response');
    }
    
    // Filter out fragments and incomplete thoughts
    const isValidTranscript = () => {
      // Check for minimum word count (complete thoughts typically have 2+ words)
      const words = cleanTranscript.split(' ');
      if (words.length < 2) return false;
      
      // Filter out common filler phrases that don't warrant responses
      const fillerPhrases = [
        /^(um|uh|er|ah)$/i,
        /^(hmm|mm|mhm)$/i
      ];
      
      const isJustFiller = fillerPhrases.some(pattern => pattern.test(cleanTranscript));
      if (isJustFiller) return false;
      
      return true;
    };
    
    if (!isValidTranscript()) {
      console.log('Transcript is fragment or filler, not responding:', cleanTranscript);
      return errorResponse('Transcript appears to be incomplete');
    }

    // Use simple, direct prompt approach - much more human
    const compiledPrompt = `You are playing the role of a prospect in a sales simulation.

SCENARIO CONTEXT:
${scenarioPrompt}

INSTRUCTIONS:
- Respond naturally as the person described in the scenario
- Stay true to the personality, motivations, and context provided
- React authentically based on the situation described
- Don't break character or reveal you are an AI
- Let the scenario description guide your level of interest, skepticism, or cooperation
- Respond with the depth and detail that this person would naturally provide

${conversationHistory.length > 0 ? `
RECENT CONVERSATION:
${serializeHistory(conversationHistory, 10).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
` : ''}

Remember: You are this specific person in this specific situation. Be human, be authentic, be consistent with the character described.`;

    console.log('Using compiled prompt with model:', AI_CONFIG.SIM_MODEL);

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Validate required environment variables
          if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured');
          }
          
          // Check if ElevenLabs is available (but don't fail if not)
          const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
          if (!hasElevenLabs) {
            console.log('ElevenLabs API key not configured, will use speech synthesis fallback');
          }

          // Generate GPT response
          console.log('Generating AI response...');
          const completion = await openai.chat.completions.create({
            model: AI_CONFIG.SIM_MODEL,
            messages: [
              { role: 'system', content: compiledPrompt },
              { role: 'user', content: cleanTranscript }
            ],
            temperature: 0.8, // Higher for more natural, varied responses
            presence_penalty: 0.1, // Lower to allow natural conversation patterns
            frequency_penalty: 0.1, // Lower to allow consistent terminology
            max_tokens: 600, // Increased for richer responses when natural
            stream: true
          });

          let fullResponse = '';
          
          // Stream the text response
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              // Send text chunk
              const textData = JSON.stringify({ type: 'text', content });
              controller.enqueue(encoder.encode(`data: ${textData}\n\n`));
            }
          }

          console.log('Full AI response:', fullResponse);

          // Log response for debugging
          console.log('Full AI response generated, length:', fullResponse.length);

          // Generate voice response with fallback to speech synthesis
          if (hasElevenLabs) {
            try {
              const elevenlabs = await getElevenLabsClient();
              const settings = voiceSettings || {};
              
              console.log('Attempting ElevenLabs voice generation...');
              const audioStream = await elevenlabs.textToSpeechStream({
                textInput: fullResponse,
                voiceId: settings.voiceId || '21m00Tcm4TlvDq8ikWAM',
                modelId: 'eleven_multilingual_v2',
                outputFormat: 'mp3_44100_128',
                voiceSettings: {
                  stability: settings.stability || 0.75,
                  similarityBoost: settings.similarityBoost || 0.75,
                }
              });

              // Stream audio chunks
              for await (const chunk of audioStream) {
                const base64Audio = Buffer.from(chunk).toString('base64');
                const audioData = JSON.stringify({ type: 'audio', content: base64Audio });
                controller.enqueue(encoder.encode(`data: ${audioData}\n\n`));
              }
            } catch (voiceError) {
              console.error('ElevenLabs voice generation error:', voiceError);
              
              // Check if it's a credits/quota error
              const errorMessage = voiceError instanceof Error ? voiceError.message : 'Unknown error';
              const isCreditsError = errorMessage.toLowerCase().includes('credits') || 
                                   errorMessage.toLowerCase().includes('quota') || 
                                   errorMessage.toLowerCase().includes('limit') ||
                                   errorMessage.toLowerCase().includes('insufficient') ||
                                   errorMessage.toLowerCase().includes('payment') ||
                                   errorMessage.toLowerCase().includes('subscription') ||
                                   errorMessage.toLowerCase().includes('unauthorized') ||
                                   errorMessage.includes('401') ||
                                   errorMessage.includes('402') ||
                                   errorMessage.includes('403');
              
              console.log(`ElevenLabs failed (${isCreditsError ? 'credits/quota issue' : 'API error'}), falling back to speech synthesis`);
              
              // Send speech synthesis fallback signal
              const fallbackData = JSON.stringify({ 
                type: 'speech_synthesis_fallback', 
                text: fullResponse,
                reason: isCreditsError ? 'credits_exhausted' : 'api_error',
                message: 'Using browser speech synthesis due to ElevenLabs unavailability'
              });
              controller.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));
            }
          } else {
            // No ElevenLabs API key, use speech synthesis directly
            console.log('Using speech synthesis (no ElevenLabs API key)');
            const fallbackData = JSON.stringify({ 
              type: 'speech_synthesis_fallback', 
              text: fullResponse,
              reason: 'no_api_key',
              message: 'Using browser speech synthesis'
            });
            controller.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));
          }

          // Send completion signal
          const doneData = JSON.stringify({ type: 'done' });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({ 
            type: 'error', 
            content: error instanceof Error ? error.message : 'Unknown error occurred' 
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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