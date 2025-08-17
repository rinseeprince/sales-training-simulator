import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors, openai } from '@/lib/api-utils';

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
      scenarioPrompt,
      duration, 
      audioUrl,
      conversationHistory = [],
      scoreOnly = false
    } = body;

    console.log('Received save call request:', { 
      callId,
      repId, 
      repIdType: typeof repId,
      scenarioName, 
      duration, 
      transcriptLength: transcript?.length,
      conversationHistoryLength: conversationHistory?.length,
      audioUrl: audioUrl,
      hasScenarioPrompt: !!scenarioPrompt
    });

    // Validate required fields
    if (!transcript || !repId || !scenarioName) {
      console.error('Missing required fields:', { transcript: !!transcript, repId: !!repId, scenarioName: !!scenarioName });
      return errorResponse('transcript, repId, and scenarioName are required');
    }

    // Use simplified AI-only scoring
    let score = 0;
    let feedback = [];
    let talkRatio = 0;
    let objectionsHandled = 0;
    let ctaUsed = false;
    let sentiment = 'neutral';

    try {
      console.log('Starting scenario-aware AI scoring...');
      console.log('Transcript structure:', {
        length: transcript.length,
        firstEntry: transcript[0],
        sample: transcript.slice(0, 2).map((entry: any, i: number) => ({
          index: i,
          keys: Object.keys(entry || {}),
          speaker: entry?.speaker,
          message: entry?.message,
          text: entry?.text
        }))
      });
      
      // Format transcript for AI analysis
      const transcriptText = transcript
        .map((turn: any) => {
          const speaker = turn.speaker || 'UNKNOWN';
          const message = turn.message || turn.text || '';
          return `${speaker.toUpperCase()}: ${message}`;
        })
        .filter((line: string) => line.trim() !== ': ')
        .join('\n');
      
      console.log('Formatted transcript for AI analysis');
      
      // Get scenario context from localStorage or use fallback
      const scenarioContext = scenarioPrompt || `Scenario: ${scenarioName}`;
      
      // Scenario-aware AI evaluation
      const evaluationPrompt = `
You are a sales coach analyzing this call. The original scenario context was:

SCENARIO CONTEXT: "${scenarioContext}"
SCENARIO NAME: "${scenarioName}"

ACTUAL CALL TRANSCRIPT:
${transcriptText}

Score this call based on how well the rep performed RELATIVE TO THE SCENARIO CONTEXT above.

Analyze the call and respond with ONLY valid JSON in this exact format:

{
  "overallScore": 75,
  "scenarioAlignment": 85,
  "talkRatio": 65,
  "objectionsRaised": 2,
  "objectionsHandled": 1,
  "ctaUsed": true,
  "sentiment": "friendly",
  "categoryScores": {
    "opening": 15,
    "discovery": 18,
    "objectionHandling": 10,
    "valueDemo": 16,
    "closing": 12
  },
  "feedback": [
    "Strong opening that established rapport quickly",
    "Excellent discovery questions about business challenges", 
    "Missed opportunity to address budget concerns",
    "Clear next steps established with specific timeline"
  ]
}

SCORING CONSIDERATIONS:
- Was the approach appropriate for the scenario described?
- Did they adapt their style to match the context?
- Were expectations realistic for this type of interaction?
- Did they achieve the scenario objectives?
- Overall Score (0-100): Consider all aspects of performance
- Scenario Alignment (0-100): How well they matched the scenario context
- Talk Ratio (0-100): Percentage rep spoke (evaluate if appropriate for this scenario)
- Objections Raised: Count of objections that were actually brought up (0 if none)
- Objections Handled: Count of objections that were properly addressed
- CTA Used: true if clear next steps were established, false otherwise
- Sentiment: "friendly", "neutral", or "tense" based on conversation tone
- Category Scores: Rate each area out of 20 points based on scenario expectations
- Feedback: 3-4 specific, actionable observations referencing the scenario

IMPORTANT: Return ONLY the JSON object. No other text.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a sales trainer. Respond only with valid JSON as specified.'
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
        throw new Error('No AI evaluation received');
      }

      // Parse AI response with error handling
      let evaluation;
      try {
        // Clean the response
        let cleanedResponse = aiEvaluation.trim();
        
        // Extract JSON if wrapped in markdown
        const jsonMatch = cleanedResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1];
        }
        
        // Find JSON object
        const jsonStart = cleanedResponse.indexOf('{');
        const jsonEnd = cleanedResponse.lastIndexOf('}') + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd);
        }
        
        evaluation = JSON.parse(cleanedResponse);
        
      } catch (parseError) {
        console.error('Failed to parse AI evaluation:', parseError);
        console.error('Raw AI response:', aiEvaluation);
        
        // Calculate basic fallback values
        const repMessages = transcript.filter((t: any) => (t.speaker || '').toLowerCase() === 'rep');
        const calculatedTalkRatio = transcript.length > 0 ? (repMessages.length / transcript.length) * 100 : 50;
        
        evaluation = {
          overallScore: 50,
          scenarioAlignment: 50,
          talkRatio: Math.round(calculatedTalkRatio),
          objectionsRaised: 0,
          objectionsHandled: 0,
          ctaUsed: false,
          sentiment: 'neutral',
          categoryScores: {
            opening: 10,
            discovery: 12,
            objectionHandling: 0,
            valueDemo: 10,
            closing: 8
          },
          feedback: ['Call completed successfully', 'Unable to generate detailed feedback due to analysis error']
        };
      }
      
      // Extract values for database storage
      score = evaluation.overallScore || 50;
      talkRatio = evaluation.talkRatio || 50;
      objectionsHandled = evaluation.objectionsHandled || 0;
      ctaUsed = evaluation.ctaUsed || false;
      sentiment = evaluation.sentiment || 'neutral';
      feedback = evaluation.feedback || ['Call analysis completed'];
      
      console.log('Scenario-aware AI scoring completed:', {
        score,
        scenarioAlignment: evaluation.scenarioAlignment,
        talkRatio,
        objectionsRaised: evaluation.objectionsRaised,
        objectionsHandled,
        ctaUsed,
        sentiment,
        feedbackCount: feedback.length,
        categoryScores: evaluation.categoryScores
      });
      
    } catch (scoringError) {
      console.error('Scenario-aware call scoring failed:', scoringError);
      // Fall back to basic scoring if new scoring fails
      try {
        const repMessages = transcript.filter((t: any) => (t.speaker || '').toLowerCase() === 'rep');
        const calculatedTalkRatio = transcript.length > 0 ? (repMessages.length / transcript.length) * 100 : 50;
        
        score = 50;
        talkRatio = Math.round(calculatedTalkRatio);
        objectionsHandled = 0;
        ctaUsed = false;
        sentiment = 'neutral';
        feedback = ['Call completed successfully', 'Detailed analysis unavailable'];
        
        console.log('Using fallback scoring values:', {
          score,
          talkRatio,
          objectionsHandled,
          ctaUsed,
          sentiment
        });
      } catch (fallbackError) {
        console.error('Fallback scoring also failed:', fallbackError);
      }
    }

    // Save to database only if not scoreOnly
    let data = null;
    if (!scoreOnly) {
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
        duration: callData.duration,
        score: callData.score
      });

      const { data: dbData, error } = await supabase
        .from('calls')
        .upsert(callData)
        .select()
        .single();

      console.log('Database response:', { data: dbData, error });

        if (error) {
          console.error('Database insert error:', error);
          return errorResponse(`Failed to save call data: ${error.message}`);
        }
        data = dbData;
      } else {
        console.log('Score-only mode: skipping database save');
      }

    return successResponse({
      callId: callId,
      score,
      feedback,
      talk_ratio: talkRatio,
      objections_handled: objectionsHandled,
      cta_used: ctaUsed,
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