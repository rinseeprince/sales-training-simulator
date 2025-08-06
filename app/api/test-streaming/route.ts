import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Parse request body
    const body = await req.json();
    
    console.log('Test streaming request:', body);

    // Validate required fields
    if (!body.transcript || !body.scenarioPrompt) {
      return errorResponse('transcript and scenarioPrompt are required');
    }

    // Set up SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Simulate AI thinking
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Send text chunks
          const responses = [
            `I appreciate you reaching out. Your message about "${body.transcript}" is interesting. As a ${body.persona || 'potential customer'}, I'd like to learn more about what you're offering.`,
            `Thanks for the call. I'm currently evaluating our options, and your mention of "${body.transcript}" caught my attention. Can you elaborate on the benefits?`,
            `That's an interesting point about "${body.transcript}". We're always looking for ways to improve our processes. What makes your solution stand out?`,
            `I see you're addressing "${body.transcript}". We've been considering similar solutions. What's your implementation timeline?`,
            `Your approach to "${body.transcript}" sounds promising. What kind of ROI can we expect to see?`
          ];
          
          const responseIndex = Math.floor(Math.random() * responses.length);
          const response = responses[responseIndex];
          
          const sentences = response.split('. ');
          for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
            
            // Send text chunk
            const textChunkData = {
              type: 'text_chunk',
              content: sentence,
              chunkId: i + 1,
              isComplete: i === sentences.length - 1
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunkData)}\n\n`));
            
            // Send audio chunk with a flag to use browser speech synthesis
            const audioChunkData = {
              type: 'audio_chunk',
              audioUrl: null, // No audio URL - will use browser speech synthesis
              useSpeechSynthesis: true, // Flag to use browser's speech synthesis
              chunkId: i + 1,
              text: sentence
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(audioChunkData)}\n\n`));
            
            // Add delay between chunks
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Send completion
          const completionData = {
            type: 'completion',
            fullResponse: response,
            totalChunks: sentences.length,
            timestamp: new Date().toISOString()
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
          
        } catch (error) {
          console.error('Test streaming error:', error);
          const errorData = {
            type: 'error',
            error: 'Test streaming failed'
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Test streaming error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 