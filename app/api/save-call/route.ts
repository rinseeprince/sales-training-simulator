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
      scenario_prompt,
      scenario_prospect_name,
      scenario_voice,
      duration, 
      audioUrl,
      conversationHistory = [],
      scoreOnly = false,
      existingEnhancedScoring = null,
      scenario_assignment_id
    } = body;


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
      
    } else {
      try {
      
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
        scenario_prompt: scenario_prompt || scenarioPrompt, // Support both field names
        scenario_prospect_name: scenario_prospect_name,
        scenario_voice: scenario_voice,
        scenario_assignment_id: scenario_assignment_id, // Link to assignment if provided
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


      const { data: dbData, error } = await supabase
        .from('calls')
        .upsert(callData)
        .select()
        .single();


        if (error) {
          console.error('Database insert error:', error);
          return errorResponse(`Failed to save call data: ${error.message}`);
        }
        data = dbData;

        // Handle assignment completion if this call is from an assigned scenario
        if (scenario_assignment_id) {
          try {
            // Get assignment details for notification
            
            const { data: assignment, error: assignmentError } = await supabase
              .from('scenario_assignments')
              .select(`
                *,
                scenario:scenarios!scenario_id(id, title),
                assigned_by_user:simple_users!assigned_by(id, name, email),
                assigned_to_user_data:simple_users!assigned_to_user(id, name, email)
              `)
              .eq('id', scenario_assignment_id)
              .single();


            if (assignmentError) {
              console.error('Error fetching assignment:', assignmentError);
            } else if (assignment) {
              // Handle both new completions and score updates for retries
              const isFirstCompletion = assignment.status !== 'completed';
              const isScoreImprovement = assignment.status === 'completed' && (!assignment.score || score > assignment.score);
              
              if (isFirstCompletion) {
                // Create completion record for first attempt
                const completionData = {
                  assignment_id: scenario_assignment_id,
                  call_id: callId,
                  completed_by: repId,
                  completed_at: new Date().toISOString()
                }
                const { error: completionError } = await supabase
                  .from('assignment_completions')
                  .insert(completionData);

                if (completionError) {
                  console.error('Error creating completion record:', completionError);
                  // Continue with assignment update even if completion record fails
                }
              }

              if (isFirstCompletion || isScoreImprovement) {
                // Update assignment status and score
                const updateData = {
                  status: 'completed',
                  completed_at: isFirstCompletion ? new Date().toISOString() : assignment.completed_at,
                  result: score >= 70 ? 'pass' : 'fail',
                  score: score
                }
                
                const { error: updateError, data: updateResult } = await supabase
                  .from('scenario_assignments')
                  .update(updateData)
                  .eq('id', scenario_assignment_id)
                  .select();

                if (updateError) {
                  console.error('Error updating assignment status:', updateError);
                }

                // Send notification to manager (for first completion or significant score improvement)
                if (assignment.assigned_by_user && (isFirstCompletion || (isScoreImprovement && score >= 70 && assignment.score < 70))) {
                  const notificationTitle = isFirstCompletion 
                    ? `Assignment Completed: ${assignment.scenario?.title || scenarioName}`
                    : `Assignment Score Improved: ${assignment.scenario?.title || scenarioName}`;
                  const notificationMessage = isFirstCompletion
                    ? `${assignment.assigned_to_user_data?.name || 'A team member'} has completed the assigned scenario "${assignment.scenario?.title || scenarioName}" with a score of ${score}%.`
                    : `${assignment.assigned_to_user_data?.name || 'A team member'} has improved their score on "${assignment.scenario?.title || scenarioName}" to ${score}%.`;
                  
                  const { error: notificationError } = await supabase
                    .from('notifications')
                    .insert({
                      recipient_id: assignment.assigned_by,
                      type: 'assignment_completed',
                      title: notificationTitle,
                      message: notificationMessage,
                      entity_type: 'scenario_assignment',
                      entity_id: scenario_assignment_id,
                      payload: {
                        scenario_assignment_id: scenario_assignment_id,
                        call_id: callId,
                        scenario_title: assignment.scenario?.title || scenarioName,
                        completed_by_name: assignment.assigned_to_user_data?.name,
                        score: score,
                        result: score >= 70 ? 'pass' : 'fail',
                        is_retry: !isFirstCompletion
                      },
                      triggered_at: new Date().toISOString()
                    });

                  if (notificationError) {
                    console.error('Error creating notification:', notificationError);
                  }
                }
              }
            }
          } catch (assignmentProcessingError) {
            console.error('❌ Error processing assignment completion:', assignmentProcessingError);
            // Don't fail the entire save operation if assignment processing fails
          }
        }
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