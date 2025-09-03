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
      scoreOnly = false,
      existingEnhancedScoring = null
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
      hasScenarioPrompt: !!scenarioPrompt,
      hasExistingEnhancedScoring: !!existingEnhancedScoring
    });

    // Validate required fields
    if (!transcript || !repId || !scenarioName) {
      console.error('Missing required fields:', { transcript: !!transcript, repId: !!repId, scenarioName: !!scenarioName });
      return errorResponse('transcript, repId, and scenarioName are required');
    }

    // Use simplified AI-only scoring
    let score = 0;
    let feedback: string[] = [];
    let talkRatio = 0;
    let objectionsHandled = 0;
    let ctaUsed = false;
    let sentiment = 'neutral';
    let enhancedScoring: any = null;

    // Check if we have existing enhanced scoring data to prevent regeneration
    if (existingEnhancedScoring) {
      console.log('Using existing enhanced scoring data to prevent regeneration');
      enhancedScoring = existingEnhancedScoring;
      score = enhancedScoring.overallScore || 50;
      talkRatio = enhancedScoring.talkRatio || 50;
      objectionsHandled = enhancedScoring.objectionsHandled || 0;
      ctaUsed = enhancedScoring.ctaUsed || false;
      sentiment = enhancedScoring.sentiment || 'neutral';
      
      // Convert enhanced scoring to feedback array for backwards compatibility
      feedback = [
        ...(enhancedScoring.strengths || []),
        ...(enhancedScoring.areasForImprovement || [])
      ];
      
      console.log('Using existing enhanced scoring:', {
        score,
        talkRatio,
        objectionsHandled,
        ctaUsed,
        sentiment,
        strengthsCount: enhancedScoring.strengths?.length || 0,
        improvementsCount: enhancedScoring.areasForImprovement?.length || 0
      });
    } else {
      try {
        console.log('Starting scenario-aware AI scoring...');
      console.log('Transcript structure:', {
        length: transcript.length,
        firstEntry: transcript[0],
        sample: transcript.slice(0, 2).map((entry: any, i: number) => ({
          index: i,
          keys: Object.keys(entry || {}),
          speaker: entry?.speaker,
          role: entry?.role,
          message: entry?.message,
          text: entry?.text,
          content: entry?.content
        }))
      });
      
      // Format transcript for AI analysis
      const transcriptText = transcript
        .map((turn: any) => {
          const speaker = turn.speaker || turn.role || 'UNKNOWN';
          const message = turn.message || turn.text || turn.content || '';
          return `${speaker.toUpperCase()}: ${message}`;
        })
        .filter((line: string) => {
          const trimmed = line.trim();
          // Filter out completely empty lines or lines with just speaker and no content
          return trimmed !== '' && 
                 trimmed !== ':' && 
                 !trimmed.match(/^[A-Z]+:\s*$/);
        })
        .join('\n');
      
      console.log('Formatted transcript for AI analysis');
      
      // Get scenario context from localStorage or use fallback
      const scenarioContext = scenarioPrompt || `Scenario: ${scenarioName}`;
      
      // Intelligent AI evaluation - ChatGPT style
      const evaluationPrompt = `
You are an experienced sales coach evaluating a practice call. Analyze this performance naturally, focusing on what matters most for this specific scenario.

SCENARIO CONTEXT: "${scenarioContext}"
SCENARIO NAME: "${scenarioName}"

ACTUAL CALL TRANSCRIPT:
${transcriptText}

IMPORTANT: Analyze ONLY what actually happened in this specific conversation. Do NOT make up or assume anything that didn't occur. If the call is too short or incomplete, be honest about that.

Evaluate this call as if you were giving feedback to the rep in person. Consider:
- What was this scenario designed to practice?
- What would success look like in this specific situation?
- How well did the rep perform against those objectives?
- What specific moments stood out (both positive and areas for improvement)?

Respond with ONLY valid JSON in this exact format:

{
  "overallScore": [0-100],
  "strengths": [
    "List only strengths that actually occurred in this conversation"
  ],
  "areasForImprovement": [
    "List only areas for improvement based on what actually happened"
  ],
  "keyMoments": [
    {
      "moment": "Specific moment from the actual conversation",
      "feedback": "Feedback about that specific moment"
    }
  ],
  "coachingTips": [
    "Actionable tips based on what actually happened in this call"
  ],
  "scenarioFit": [0-100],
  "readyForRealCustomers": [true/false],
  "talkRatio": [0-100],
  "objectionsHandled": [number],
  "ctaUsed": [true/false],
  "sentiment": "[positive/neutral/negative]"
}

CRITICAL: Base your analysis ONLY on the actual conversation above. If the call is too short for meaningful analysis, be honest about that and provide appropriate feedback. Do not invent or assume anything that didn't happen. Be specific, constructive, and focus on what actually matters for THIS scenario.`;

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
          strengths: ['Call completed successfully'],
          areasForImprovement: ['Unable to generate detailed analysis'],
          keyMoments: [],
          coachingTips: ['Please retry for detailed feedback'],
          scenarioFit: 50,
          readyForRealCustomers: false,
          talkRatio: Math.round(calculatedTalkRatio),
          objectionsHandled: 0,
          ctaUsed: false,
          sentiment: 'neutral'
        };
      }
      
      // Extract values for database storage
      score = evaluation.overallScore || 50;
      talkRatio = evaluation.talkRatio || 50;
      objectionsHandled = evaluation.objectionsHandled || 0;
      ctaUsed = evaluation.ctaUsed || false;
      sentiment = evaluation.sentiment || 'neutral';
      
      // Convert new format to feedback array for backwards compatibility
      feedback = [
        ...evaluation.strengths || [],
        ...evaluation.areasForImprovement || []
      ];
      
      // Store enhanced scoring data for frontend (don't use const to avoid shadowing)
      enhancedScoring = {
        overallScore: evaluation.overallScore || 50,
        strengths: evaluation.strengths || [],
        areasForImprovement: evaluation.areasForImprovement || [],
        keyMoments: evaluation.keyMoments || [],
        coachingTips: evaluation.coachingTips || [],
        scenarioFit: evaluation.scenarioFit || 50,
        readyForRealCustomers: evaluation.readyForRealCustomers || false
      };
      
      console.log('Intelligent AI scoring completed:', {
        score,
        scenarioFit: evaluation.scenarioFit,
        talkRatio,
        objectionsHandled,
        ctaUsed,
        sentiment,
        strengthsCount: evaluation.strengths?.length || 0,
        improvementsCount: evaluation.areasForImprovement?.length || 0,
        keyMomentsCount: evaluation.keyMoments?.length || 0
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
        
        // Default enhanced scoring for fallback
        enhancedScoring = {
          overallScore: score,
          strengths: ['Call completed successfully'],
          areasForImprovement: ['Detailed analysis unavailable'],
          keyMoments: [],
          coachingTips: ['Please retry for detailed feedback'],
          scenarioFit: 50,
          readyForRealCustomers: false
        };
        
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
    } // Close the else block for existing enhanced scoring check

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
        enhanced_scoring: enhancedScoring, // Save the detailed feedback
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Inserting call data:', {
        id: callData.id,
        rep_id: callData.rep_id,
        scenario_name: callData.scenario_name?.substring(0, 50) + '...',
        audio_url: callData.audio_url ? 'PRESENT' : 'MISSING',
        duration: callData.duration,
        score: callData.score,
        enhanced_scoring: callData.enhanced_scoring ? 'PRESENT' : 'MISSING',
        enhanced_scoring_data: callData.enhanced_scoring
      });

      const { data: dbData, error } = await supabase
        .from('calls')
        .upsert(callData)
        .select()
        .single();

      console.log('Database response:', { 
        data: dbData ? {
          id: dbData.id,
          score: dbData.score,
          enhanced_scoring: dbData.enhanced_scoring ? 'PRESENT' : 'MISSING',
          enhanced_scoring_data: dbData.enhanced_scoring
        } : null, 
        error 
      });

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
      success: true,
      // Include enhanced scoring data for frontend
      enhancedScoring: enhancedScoring
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