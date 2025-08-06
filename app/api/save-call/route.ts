import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { openai } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { 
      callId,
      transcript, 
      repId, 
      scenarioName, 
      duration, 
      audioUrl,
      conversationHistory = []
    } = body;

    console.log('Received save call request:', { 
      callId,
      repId, 
      repIdType: typeof repId,
      scenarioName, 
      duration, 
      transcriptLength: transcript?.length,
      conversationHistoryLength: conversationHistory?.length,
      audioUrl: audioUrl
    });

    // Validate required fields
    if (!transcript || !repId || !scenarioName) {
      console.error('Missing required fields:', { transcript: !!transcript, repId: !!repId, scenarioName: !!scenarioName });
      return errorResponse('transcript, repId, and scenarioName are required');
    }

    // Score the call using AI
    let score = 0;
    let feedback = [];
    let talkRatio = 0;
    let objectionsHandled = 0;
    let ctaUsed = false;
    let sentiment = 'neutral';

    try {
      const scoringPrompt = `
        Analyze this sales call transcript and provide a score from 0-100 and detailed feedback.
        
        Transcript: ${JSON.stringify(transcript)}
        
        Provide your response in this exact JSON format:
        {
          "score": 85,
          "feedback": ["Good opening", "Could improve objection handling"],
          "talkRatio": 65,
          "objectionsHandled": 2,
          "ctaUsed": true,
          "sentiment": "friendly"
        }
        
        Scoring criteria:
        - Opening and value proposition (20 points)
        - Discovery and qualification (20 points)
        - Objection handling (25 points)
        - Closing and next steps (20 points)
        - Overall communication (15 points)
      `;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: scoringPrompt }],
        max_tokens: 500,
        temperature: 0.3,
      });

      const scoringResult = completion.choices[0]?.message?.content;
      if (scoringResult) {
        try {
          const parsed = JSON.parse(scoringResult);
          score = parsed.score || 0;
          feedback = parsed.feedback || [];
          talkRatio = parsed.talkRatio || 0;
          objectionsHandled = parsed.objectionsHandled || 0;
          ctaUsed = parsed.ctaUsed || false;
          sentiment = parsed.sentiment || 'neutral';
        } catch (parseError) {
          console.error('Failed to parse scoring result:', parseError);
        }
      }
    } catch (scoringError) {
      console.error('Call scoring failed:', scoringError);
      // Continue without scoring if it fails
    }

    // Save to database
    const callData = {
      id: callId, // Use the provided call ID
      rep_id: repId,
      scenario_name: scenarioName,
      transcript: transcript,
      score: score,
      talk_ratio: talkRatio,
      objections_handled: objectionsHandled,
      cta_used: ctaUsed,
      sentiment: sentiment,
      feedback: feedback,
      duration: duration,
      audio_url: audioUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting call data:', {
      id: callData.id,
      rep_id: callData.rep_id,
      scenario_name: callData.scenario_name?.substring(0, 50) + '...',
      audio_url: callData.audio_url ? 'PRESENT' : 'MISSING',
      duration: callData.duration
    });

    const { data, error } = await supabase
      .from('calls')
      .insert(callData)
      .select()
      .single();

    console.log('Database response:', { data, error });

    if (error) {
      console.error('Database insert error:', error);
      return errorResponse(`Failed to save call data: ${error.message}`);
    }

    return successResponse({
      callId: data.id,
      score,
      feedback,
      talkRatio,
      objectionsHandled,
      ctaUsed,
      sentiment,
      success: true
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Save call error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 