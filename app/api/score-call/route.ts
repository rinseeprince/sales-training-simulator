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
      .map((turn: any) => `${turn.speaker}: ${turn.message}`)
      .join('\n');

    // Calculate basic metrics
    const repMessages = transcript.filter((turn: any) => turn.speaker === 'rep');
    const aiMessages = transcript.filter((turn: any) => turn.speaker === 'ai');
    const totalMessages = transcript.length;
    const talkRatio = totalMessages > 0 ? (repMessages.length / totalMessages) * 100 : 0;

    // Use GPT-4o to evaluate the call
    const evaluationPrompt = `
You are an expert sales trainer evaluating a sales call transcript. Please analyze the following conversation and provide a comprehensive evaluation.

TRANSCRIPT:
${transcriptText}

Please provide your evaluation in the following JSON format:
{
  "score": number (0-100),
  "talkRatio": number (percentage of rep vs AI messages),
  "objectionsHandled": number,
  "ctaUsed": boolean,
  "sentiment": "friendly" | "aggressive" | "neutral",
  "feedback": [
    "specific feedback point 1",
    "specific feedback point 2",
    "specific feedback point 3",
    "specific feedback point 4",
    "specific feedback point 5"
  ]
}

Evaluation criteria:
- Score: Consider rapport building, objection handling, value proposition, closing techniques
- Objections handled: Count how many customer objections were properly addressed
- CTA used: Check if a clear call-to-action was made
- Sentiment: Overall tone of the conversation
- Feedback: Provide 3-5 specific, actionable improvement points

Respond ONLY with valid JSON, no additional text.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a sales training expert. Respond only with valid JSON as specified.'
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const aiEvaluation = completion.choices[0]?.message?.content;
    
    if (!aiEvaluation) {
      return errorResponse('Failed to generate evaluation');
    }

    // Parse AI response
    let evaluation;
    try {
      evaluation = JSON.parse(aiEvaluation);
    } catch (parseError) {
      console.error('Failed to parse AI evaluation:', parseError);
      return errorResponse('Failed to parse evaluation response');
    }

    // Combine AI evaluation with calculated metrics
    const result = {
      score: evaluation.score || 0,
      talkRatio: talkRatio,
      objectionsHandled: evaluation.objectionsHandled || 0,
      ctaUsed: evaluation.ctaUsed || false,
      sentiment: evaluation.sentiment || 'neutral',
      feedback: evaluation.feedback || [],
      metrics: {
        totalMessages,
        repMessages: repMessages.length,
        aiMessages: aiMessages.length,
        duration: transcript.length * 30, // Rough estimate: 30 seconds per message
      }
    };

    return successResponse(result, 200, corsHeaders);

  } catch (error) {
    console.error('Score call error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 