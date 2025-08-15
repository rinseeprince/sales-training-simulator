import { NextRequest, NextResponse } from 'next/server';
import { openai, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { AI_CONFIG } from '@/lib/ai-config';

const COACHING_PROMPT = `You are an expert sales coach analyzing a call transcript. Provide specific, actionable feedback.

GRADING RUBRIC:
- Opening (0-20): Clear value prop, professional tone
- Discovery (0-25): Quality questions, active listening
- Objection Handling (0-20): Addressed concerns effectively
- Value Demonstration (0-20): Connected features to benefits
- Closing (0-15): Clear next steps, timeline

FEEDBACK FORMAT:
- Overall Score: X/100
- Strengths: 2-3 specific examples
- Improvements: 2-3 actionable recommendations
- Next Steps: 1-2 concrete actions for next call

Be direct but constructive. Focus on behaviors, not personality.`;

interface CoachingFeedback {
  overallScore: number;
  categoryScores: {
    opening: number;
    discovery: number;
    objectionHandling: number;
    valueDemonstration: number;
    closing: number;
  };
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  feedback: string;
  model: string;
  timestamp: string;
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
    const { transcript } = body;

    // Validate required fields
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return errorResponse('transcript is required and must be a non-empty array');
    }

    // Convert transcript to readable format
    const transcriptText = transcript
      .map((turn: any) => `${turn.speaker}: ${turn.message}`)
      .join('\n');

    // Use GPT-5 to evaluate the call with structured output
    const evaluationPrompt = `
Analyze the following sales call transcript and provide structured feedback.

TRANSCRIPT:
${transcriptText}

Provide your evaluation in the following JSON format:
{
  "overallScore": number (0-100),
  "categoryScores": {
    "opening": number (0-20),
    "discovery": number (0-25),
    "objectionHandling": number (0-20),
    "valueDemonstration": number (0-20),
    "closing": number (0-15)
  },
  "strengths": [
    "Specific strength example 1 with context from the call",
    "Specific strength example 2 with context from the call",
    "Specific strength example 3 with context from the call"
  ],
  "improvements": [
    "Actionable improvement 1 with specific example of what to do differently",
    "Actionable improvement 2 with specific example of what to do differently",
    "Actionable improvement 3 with specific example of what to do differently"
  ],
  "nextSteps": [
    "Concrete action for next call",
    "Concrete action for skill development"
  ]
}

IMPORTANT: 
- Reference specific moments from the transcript
- Make feedback actionable and behavioral
- Be constructive but honest about areas for improvement
- Respond ONLY with valid JSON, no additional text`;

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.COACH_MODEL,
      messages: [
        {
          role: 'system',
          content: COACHING_PROMPT
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
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
      console.error('Raw AI response:', aiEvaluation);
      return errorResponse('Failed to parse evaluation response');
    }

    // Calculate basic metrics from transcript
    const repMessages = transcript.filter((turn: any) => turn.speaker === 'rep');
    const aiMessages = transcript.filter((turn: any) => turn.speaker === 'ai');
    const totalMessages = transcript.length;
    const talkRatio = totalMessages > 0 ? (repMessages.length / totalMessages) * 100 : 0;

    // Compile the full feedback response
    const result: CoachingFeedback = {
      overallScore: evaluation.overallScore || 0,
      categoryScores: {
        opening: evaluation.categoryScores?.opening || 0,
        discovery: evaluation.categoryScores?.discovery || 0,
        objectionHandling: evaluation.categoryScores?.objectionHandling || 0,
        valueDemonstration: evaluation.categoryScores?.valueDemonstration || 0,
        closing: evaluation.categoryScores?.closing || 0
      },
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      nextSteps: evaluation.nextSteps || [],
      feedback: `Overall Score: ${evaluation.overallScore}/100\n\nStrengths:\n${evaluation.strengths?.join('\n') || 'None identified'}\n\nAreas for Improvement:\n${evaluation.improvements?.join('\n') || 'None identified'}\n\nNext Steps:\n${evaluation.nextSteps?.join('\n') || 'None identified'}`,
      model: AI_CONFIG.COACH_MODEL,
      timestamp: new Date().toISOString(),
    };

    // Add metrics to the response
    const fullResult = {
      ...result,
      metrics: {
        totalMessages,
        repMessages: repMessages.length,
        aiMessages: aiMessages.length,
        talkRatio: Math.round(talkRatio),
        duration: transcript.length * 30, // Rough estimate: 30 seconds per message
      }
    };

    return successResponse(fullResult, 200, corsHeaders);

  } catch (error) {
    console.error('Coach call error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
