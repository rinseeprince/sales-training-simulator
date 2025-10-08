import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { transcript } = body;

    // Validate required fields
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return errorResponse('transcript is required and must be a non-empty array');
    }

    // Convert transcript to readable format
    const transcriptText = transcript
      .map((turn: any, index: number) => `[${index + 1}] ${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n\n');

    // Simple, direct prompt to OpenAI
    const prompt = `You are an expert sales coach. Please analyze this sales call transcript and provide detailed, actionable coaching feedback.

TRANSCRIPT:
${transcriptText}

Please provide comprehensive feedback covering:
1. Overall performance assessment and deal probability
2. What the rep did well (be specific with examples)
3. Areas for improvement (be specific with examples and suggestions)
4. Key moments and missed opportunities
5. Specific coaching recommendations for next steps
6. Questions to ask on the next call
7. How to handle any objections that came up

Be direct, specific, and actionable. Reference exact quotes from the transcript when possible. Focus on practical advice that will immediately improve performance.`;

    console.log('🎯 Calling OpenAI for coaching feedback...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales coach with 20+ years of experience. Provide detailed, specific, and actionable coaching feedback. Be direct and practical.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const feedback = completion.choices[0]?.message?.content;
    
    if (!feedback) {
      return errorResponse('Failed to generate coaching feedback');
    }

    console.log('✅ Coaching feedback generated successfully');

    return successResponse({
      feedback: feedback,
      timestamp: new Date().toISOString(),
      model: 'gpt-4',
      transcriptLength: transcript.length
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Simple coaching error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}