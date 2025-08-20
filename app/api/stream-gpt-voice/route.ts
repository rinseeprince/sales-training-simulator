import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, validateStreamingEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { compileProspectPrompt, serializeHistory, validateProspectReply } from '@/lib/prompt-compiler';
import { AI_CONFIG, LEGACY_MODE } from '@/lib/ai-config';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Helper function to generate unique temporary file paths
function getTempFilePath(prefix: string, extension: string = 'mp3'): string {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return path.join(tempDir, `${prefix}_${timestamp}_${random}.${extension}`);
}

// Helper function to safely read and delete audio file
async function readAndDeleteAudioFile(filePath: string): Promise<Buffer | null> {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Audio file not found: ${filePath}`);
      return null;
    }
    
    const audioBuffer = fs.readFileSync(filePath);
    console.log(`Audio file read successfully: ${filePath}, size: ${audioBuffer.length} bytes`);
    
    // Clean up the file
    try {
      fs.unlinkSync(filePath);
      console.log(`Audio file cleaned up: ${filePath}`);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup audio file ${filePath}:`, cleanupError);
    }
    
    return audioBuffer;
  } catch (error) {
    console.error(`Error reading audio file ${filePath}:`, error);
    return null;
  }
}

// Helper function to generate ElevenLabs audio with proper error handling
async function generateElevenLabsAudio(
  text: string, 
  voiceSettings: any, 
  chunkId?: number
): Promise<{ success: boolean; audioBase64?: string; error?: string; fallbackReason?: string }> {
  try {
    console.log(`Generating ElevenLabs audio for chunk ${chunkId || 'full'}, text: "${text.substring(0, 50)}..."`);
    
    const elevenlabsClient = await getElevenLabsClient();
    const voiceId = voiceSettings.voiceId || process.env.DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    
    // Generate unique temporary file path
    const tempFilePath = getTempFilePath(`audio_${chunkId || 'full'}`);
    console.log('Using temporary file path:', tempFilePath);
    
    const audioResult = await elevenlabsClient.textToSpeech({
      fileName: tempFilePath,
      textInput: text,
      voiceId: voiceId,
      model_id: 'eleven_turbo_v2',
      stability: voiceSettings.stability || 0.5,
      similarityBoost: voiceSettings.similarityBoost || 0.5,
      style: voiceSettings.style || 0.0,
      useSpeakerBoost: voiceSettings.useSpeakerBoost || true,
    });

    console.log('ElevenLabs API response:', audioResult);

    // Check if audioResult exists and has valid status
    if (!audioResult) {
      throw new Error('ElevenLabs returned empty response');
    }
    
    if (audioResult.status && audioResult.status !== 'ok') {
      throw new Error(`ElevenLabs returned status: ${audioResult.status}`);
    }
    
    // Read the generated audio file
    const audioBuffer = await readAndDeleteAudioFile(tempFilePath);
    
    if (!audioBuffer) {
      throw new Error('Failed to read generated audio file');
    }

    // Convert audio buffer to base64
    const audioBase64 = audioBuffer.toString('base64');
    console.log(`Audio generated successfully, base64 length: ${audioBase64.length}`);
    
    return { success: true, audioBase64 };
    
  } catch (error) {
    console.error('ElevenLabs audio generation failed:', error);
    
    // Determine if it's a credits/quota error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    
    return { 
      success: false, 
      error: errorMessage,
      fallbackReason: isCreditsError ? 'credits_exhausted' : 'api_error'
    };
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
            // Use the scenario prompt directly for simplified architecture
            return `YOU ARE THE PROSPECT/CUSTOMER, NOT THE SALESPERSON.

You are being contacted by a sales representative. Your role is to act as the potential customer/prospect that they are trying to sell to.

SCENARIO CONTEXT:
${scenarioPrompt}

CRITICAL INSTRUCTIONS:
- You are the PROSPECT/CUSTOMER being sold to
- The human user is the SALES REP trying to sell to you
- NEVER act as a salesperson or ask about their business strategies
- Respond as someone who might be interested in THEIR product/service
- Ask questions about what THEY are offering YOU
- Stay in character as the person described in the scenario
- React naturally based on the personality, motivations, and context provided in the scenario
- Let the scenario description guide your level of interest, skepticism, or cooperation
- Respond with the depth and detail that this person would naturally provide

REMEMBER: You are the one being sold to, not the one selling! Stay true to the character described in the scenario.`;
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
                  try {
                    const audioResult = await generateElevenLabsAudio(
                      currentSentence.trim(), 
                      voiceSettings, 
                      sentenceCount
                    );
                    
                    if (audioResult.success && audioResult.audioBase64) {
                      // ElevenLabs audio generated successfully
                      // Chunk the base64 audio data to avoid SSE message size limits
                      const base64Data = audioResult.audioBase64;
                      const chunkSize = 16384; // 16KB chunks
                      
                      for (let i = 0; i < base64Data.length; i += chunkSize) {
                        const chunk = base64Data.slice(i, i + chunkSize);
                        const isLastChunk = i + chunkSize >= base64Data.length;
                        
                        const audioData = {
                          type: 'audio_chunk',
                          audioUrl: `data:audio/mpeg;base64,${chunk}`,
                          chunkId: sentenceCount,
                          text: currentSentence.trim(),
                          isPartial: !isLastChunk,
                          chunkIndex: Math.floor(i / chunkSize),
                          totalChunks: Math.ceil(base64Data.length / chunkSize)
                        };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                      }
                    } else {
                      // ElevenLabs failed, use speech synthesis fallback
                      console.log(`ElevenLabs failed for chunk ${sentenceCount}, using speech synthesis fallback:`, audioResult.fallbackReason);
                      
                      const fallbackAudioData = {
                        type: 'audio_chunk',
                        audioUrl: null, // No audio URL - will use speech synthesis
                        chunkId: sentenceCount,
                        text: currentSentence.trim(),
                        useSpeechSynthesis: true, // Explicitly flag for speech synthesis
                        fallbackReason: audioResult.fallbackReason
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
                      
                      // Also send error notification with more context
                      const errorData = {
                        type: 'voice_error',
                        chunkId: sentenceCount,
                        error: `Voice generation failed: ${audioResult.error}`,
                        fallbackToSpeechSynthesis: true,
                        reason: audioResult.fallbackReason
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
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
                      
                      // Also send error notification with more context
                      const errorData = {
                        type: 'voice_error',
                        chunkId: sentenceCount,
                        error: `Voice generation failed: ${voiceError instanceof Error ? voiceError.message : 'Unknown error'}`,
                        fallbackToSpeechSynthesis: true,
                        reason: 'api_error'
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
              try {
                const audioResult = await generateElevenLabsAudio(
                  currentSentence.trim(), 
                  voiceSettings, 
                  sentenceCount
                );
                
                if (audioResult.success && audioResult.audioBase64) {
                  // ElevenLabs audio generated successfully
                  // Chunk the base64 audio data to avoid SSE message size limits
                  const base64Data = audioResult.audioBase64;
                  const chunkSize = 16384; // 16KB chunks
                  
                  for (let i = 0; i < base64Data.length; i += chunkSize) {
                    const chunk = base64Data.slice(i, i + chunkSize);
                    const isLastChunk = i + chunkSize >= base64Data.length;
                    
                    const audioData = {
                      type: 'audio_chunk',
                      audioUrl: `data:audio/mpeg;base64,${chunk}`,
                      chunkId: sentenceCount,
                      text: currentSentence.trim(),
                      isPartial: !isLastChunk,
                      chunkIndex: Math.floor(i / chunkSize),
                      totalChunks: Math.ceil(base64Data.length / chunkSize)
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioData)}\n\n`));
                  }
                } else {
                  // ElevenLabs failed, use speech synthesis fallback
                  console.log(`ElevenLabs failed for final chunk ${sentenceCount}, using speech synthesis fallback:`, audioResult.fallbackReason);
                  
                  const fallbackAudioData = {
                    type: 'audio_chunk',
                    audioUrl: null, // No audio URL - will use speech synthesis
                    chunkId: sentenceCount,
                    text: currentSentence.trim(),
                    useSpeechSynthesis: true, // Explicitly flag for speech synthesis
                    fallbackReason: audioResult.fallbackReason
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(fallbackAudioData)}\n\n`));
                  
                  // Also send error notification with more context
                  const errorData = {
                    type: 'voice_error',
                    chunkId: sentenceCount,
                    error: `Voice generation failed: ${audioResult.error}`,
                    fallbackToSpeechSynthesis: true,
                    reason: audioResult.fallbackReason
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
                }
                              } catch (voiceError) {
                  console.error('Voice generation failed for final chunk:', voiceError);
                  
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
                  
                  // Also send error notification with more context
                  const errorData = {
                    type: 'voice_error',
                    chunkId: sentenceCount,
                    error: `Voice generation failed: ${voiceError instanceof Error ? voiceError.message : 'Unknown error'}`,
                    fallbackToSpeechSynthesis: true,
                    reason: 'api_error'
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
              const settings = voiceSettings || {};
              console.log('Attempting ElevenLabs voice generation...');
              
              const audioResult = await generateElevenLabsAudio(fullResponse, settings);
              
              if (audioResult.success && audioResult.audioBase64) {
                // ElevenLabs audio generated successfully
                // Chunk the base64 audio data to avoid SSE message size limits
                const base64Data = audioResult.audioBase64;
                const chunkSize = 16384; // 16KB chunks
                
                for (let i = 0; i < base64Data.length; i += chunkSize) {
                  const chunk = base64Data.slice(i, i + chunkSize);
                  const isLastChunk = i + chunkSize >= base64Data.length;
                  
                  const audioData = JSON.stringify({ 
                    type: 'audio', 
                    content: chunk,
                    isPartial: !isLastChunk,
                    chunkIndex: Math.floor(i / chunkSize),
                    totalChunks: Math.ceil(base64Data.length / chunkSize)
                  });
                  controller.enqueue(encoder.encode(`data: ${audioData}\n\n`));
                }
              } else {
                // ElevenLabs failed, use speech synthesis fallback
                console.log(`ElevenLabs failed, using speech synthesis fallback:`, audioResult.fallbackReason);
                
                const fallbackData = JSON.stringify({ 
                  type: 'speech_synthesis_fallback', 
                  text: fullResponse,
                  reason: audioResult.fallbackReason,
                  message: 'Using browser speech synthesis due to ElevenLabs unavailability'
                });
                controller.enqueue(encoder.encode(`data: ${fallbackData}\n\n`));
              }
                          } catch (voiceError) {
                console.error('ElevenLabs voice generation error:', voiceError);
                
                // Send speech synthesis fallback signal
                const fallbackData = JSON.stringify({ 
                  type: 'speech_synthesis_fallback', 
                  text: fullResponse,
                  reason: 'api_error',
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