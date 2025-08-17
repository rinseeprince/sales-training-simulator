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

    // Use GPT to evaluate the call with structured output
    const evaluationPrompt = `
You are a sales coach analyzing a call transcript. Provide a structured evaluation in valid JSON format.

TRANSCRIPT:
${transcriptText}

Analyze this call and respond with ONLY valid JSON in this exact format (no additional text, no markdown, no explanations):

{
  "overallScore": 75,
  "categoryScores": {
    "opening": 15,
    "discovery": 20,
    "objectionHandling": 0,
    "valueDemonstration": 18,
    "closing": 12
  },
  "strengths": [
    "Strong opening with clear value proposition",
    "Effective discovery questions about current challenges"
  ],
  "improvements": [
    "Ask more follow-up questions to deepen discovery",
    "Provide more specific examples when demonstrating value"
  ],
  "nextSteps": [
    "Practice asking deeper discovery questions",
    "Prepare specific case studies for value demonstration"
  ]
}

SCORING GUIDELINES:
- Opening (0-20): Professional greeting, value proposition clarity
- Discovery (0-25): Question quality, listening, pain identification  
- Objection Handling (0-20): Only score if objections were raised and addressed
- Value Demonstration (0-20): Benefit articulation, feature-to-benefit conversion
- Closing (0-15): Clear next steps, commitment gained

IMPORTANT: Return ONLY the JSON object. No other text.`;

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

    // Parse AI response with better error handling
    let evaluation;
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = aiEvaluation.trim();
      
      // Extract JSON if it's wrapped in markdown
      const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[1];
      }
      
      // Try to find the JSON object if there's extra text
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
      }
      
      evaluation = JSON.parse(cleanedResponse);
      
      // Validate the structure
      if (!evaluation.overallScore && evaluation.overallScore !== 0) {
        throw new Error('Missing overallScore');
      }
      if (!evaluation.categoryScores) {
        throw new Error('Missing categoryScores');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI evaluation:', parseError);
      console.error('Raw AI response:', aiEvaluation);
      
      // Create fallback evaluation
      evaluation = {
        overallScore: 50,
        categoryScores: {
          opening: 10,
          discovery: 12,
          objectionHandling: objectionCount > 0 ? 10 : 0,
          valueDemonstration: 10,
          closing: 8
        },
        strengths: ['Call completed successfully'],
        improvements: ['Unable to generate detailed feedback due to analysis error'],
        nextSteps: ['Review call recording for self-assessment']
      };
      
      console.log('Using fallback evaluation due to parsing error');
    }

    // Calculate basic metrics from transcript
    const repMessages = transcript.filter((turn: any) => turn.speaker === 'rep');
    const aiMessages = transcript.filter((turn: any) => turn.speaker === 'ai');
    const totalMessages = transcript.length;
    const talkRatio = totalMessages > 0 ? (repMessages.length / totalMessages) * 100 : 0;
    
    // Analyze objections more accurately
    const objectionCount = transcript.filter((turn: any) => {
      if (turn.speaker === 'ai' || turn.speaker === 'prospect') {
        const lower = turn.message.toLowerCase();
        return lower.includes('too expensive') || lower.includes('not interested') || 
               lower.includes('already have') || lower.includes('not the right time') ||
               lower.includes('need to think') || lower.includes('budget');
      }
      return false;
    }).length;

    // Compile the full feedback response
    const result: CoachingFeedback = {
      overallScore: evaluation.overallScore || 0,
      categoryScores: {
        opening: evaluation.categoryScores?.opening || 0,
        discovery: evaluation.categoryScores?.discovery || 0,
        objectionHandling: objectionCount > 0 ? evaluation.categoryScores?.objectionHandling || 0 : 0,
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
        objectionsRaised: objectionCount,
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
