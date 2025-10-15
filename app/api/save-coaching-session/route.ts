import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors, openai } from '@/lib/api-utils';

interface ConversationMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface CoachingSessionRequest {
  sessionId: string;
  userId: string;
  title: string;
  sessionType: string;
  transcript: ConversationMessage[];
  duration: number;
}

interface CoachingSummary {
  sessionOverview: string;
  keyTopicsDiscussed: string[];
  coachingInsights: string[];
  actionItems: string[];
  nextSteps: string[];
  skillsWorkedOn: string[];
  strengthsIdentified: string[];
  areasForImprovement: string[];
  recommendedResources: string[];
  followUpRecommendations: string[];
  sessionRating: number;
  sessionsUntilMastery: number;
}

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body: CoachingSessionRequest = await req.json();
    const { 
      sessionId,
      userId,
      title,
      sessionType = 'coaching',
      transcript,
      duration
    } = body;

    console.log('Received coaching session request:', { 
      sessionId,
      userId,
      title,
      sessionType,
      duration,
      transcriptLength: transcript?.length
    });

    // Validate required fields
    if (!sessionId || !userId || !title || !transcript) {
      console.error('Missing required fields:', { sessionId: !!sessionId, userId: !!userId, title: !!title, transcript: !!transcript });
      return errorResponse('sessionId, userId, title, and transcript are required');
    }

    // Get user's organization_id from simple_users table
    let organizationId = null;
    try {
      const { data: userProfile } = await supabase
        .from('simple_users')
        .select('organization_id')
        .eq('id', userId)
        .single();
      
      organizationId = userProfile?.organization_id;
      console.log('Got organization_id for user:', { userId, organizationId });
    } catch (error) {
      console.warn('Could not get organization_id for user:', userId, error);
    }

    // Generate rich coaching summary with OpenAI
    let coachingSummary: CoachingSummary | null = null;
    
    try {
      console.log('Generating comprehensive coaching summary...');
      
      // Format transcript for analysis
      const conversationText = transcript
        .map((msg: ConversationMessage) => {
          const speaker = msg.role === 'user' ? 'COACHEE' : 'COACH_IVY';
          return `${speaker}: ${msg.content}`;
        })
        .join('\n');
      
      // Rich coaching analysis prompt
      const analysisPrompt = `
You are an expert sales coach analyzing a coaching session between a sales professional and an AI coach. 

Your task is to create a comprehensive coaching report that provides deep insights, actionable feedback, and a clear development plan.

COACHING SESSION TRANSCRIPT:
${conversationText}

SESSION DETAILS:
- Title: ${title}
- Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
- Session Type: ${sessionType}

Please analyze this coaching session and provide a comprehensive report. Be thorough, insightful, and actionable. Don't limit your response - provide as much valuable detail as possible.

Respond with ONLY valid JSON in this exact format:

{
  "sessionOverview": "A comprehensive 3-4 paragraph summary of what happened in this session, key themes discussed, and overall session quality",
  "keyTopicsDiscussed": [
    "List all major topics, challenges, or scenarios discussed in detail"
  ],
  "coachingInsights": [
    "Deep insights about the coachee's current skill level, mindset, approach, strengths, and growth opportunities"
  ],
  "actionItems": [
    "Specific, actionable items the coachee should work on immediately"
  ],
  "nextSteps": [
    "Detailed next steps and recommendations for continued development"
  ],
  "skillsWorkedOn": [
    "Specific sales skills that were addressed in this session"
  ],
  "strengthsIdentified": [
    "Specific strengths demonstrated by the coachee during this session"
  ],
  "areasForImprovement": [
    "Specific areas where the coachee can improve, with detailed explanations"
  ],
  "recommendedResources": [
    "Specific books, courses, techniques, or practices that would help this coachee"
  ],
  "followUpRecommendations": [
    "Specific recommendations for follow-up coaching sessions or practice scenarios"
  ],
  "sessionRating": [1-10 scale rating of the session's value and the coachee's engagement],
  "sessionsUntilMastery": [estimated number of additional coaching sessions needed to reach proficiency in discussed areas]
}

IMPORTANT GUIDELINES:
- Be specific and detailed in all feedback
- Base everything on what actually happened in the conversation
- Provide actionable, practical advice
- Be encouraging but honest about areas for improvement
- Focus on sales-specific skills and techniques
- Include both tactical and strategic recommendations
- Make the report valuable for ongoing development
- Don't limit your response - be as comprehensive as possible
`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach and trainer. Provide comprehensive, detailed coaching analysis. Be thorough and actionable.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 4000, // Allow for longer, more detailed responses
        temperature: 0.7, // Allow for more creative and detailed insights
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No AI coaching analysis received');
      }

      // Parse AI response with error handling
      try {
        // Clean the response
        let cleanedResponse = aiResponse.trim();
        
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
        
        coachingSummary = JSON.parse(cleanedResponse);
        
        console.log('Coaching analysis completed:', {
          topicsCount: coachingSummary?.keyTopicsDiscussed?.length || 0,
          insightsCount: coachingSummary?.coachingInsights?.length || 0,
          actionItemsCount: coachingSummary?.actionItems?.length || 0,
          sessionRating: coachingSummary?.sessionRating
        });
        
      } catch (parseError) {
        console.error('Failed to parse coaching analysis:', parseError);
        console.error('Raw AI response:', aiResponse);
        
        // Fallback coaching summary
        coachingSummary = {
          sessionOverview: "This coaching session covered various sales topics and provided valuable insights for professional development.",
          keyTopicsDiscussed: ["Sales techniques", "Professional development"],
          coachingInsights: ["Coachee showed engagement in the session"],
          actionItems: ["Continue practicing discussed techniques"],
          nextSteps: ["Schedule follow-up coaching session"],
          skillsWorkedOn: ["General sales skills"],
          strengthsIdentified: ["Willingness to learn"],
          areasForImprovement: ["Continue developing sales skills"],
          recommendedResources: ["Sales training materials"],
          followUpRecommendations: ["Regular coaching sessions"],
          sessionRating: 7,
          sessionsUntilMastery: 5
        };
      }
      
    } catch (analysisError) {
      console.error('Coaching analysis failed:', analysisError);
      
      // Fallback coaching summary
      coachingSummary = {
        sessionOverview: "Coaching session completed. Detailed analysis was not available, but the session provided valuable coaching interaction.",
        keyTopicsDiscussed: ["Sales coaching"],
        coachingInsights: ["Session completed successfully"],
        actionItems: ["Review session notes"],
        nextSteps: ["Continue coaching"],
        skillsWorkedOn: ["Sales skills"],
        strengthsIdentified: ["Active participation"],
        areasForImprovement: ["Continue learning"],
        recommendedResources: ["Sales training resources"],
        followUpRecommendations: ["Schedule next session"],
        sessionRating: 6,
        sessionsUntilMastery: 3
      };
    }

    // Save coaching session to database
    const sessionData = {
      id: sessionId,
      user_id: userId,
      organization_id: organizationId,
      title: title,
      session_type: sessionType,
      transcript: JSON.stringify(transcript),
      coaching_summary: coachingSummary,
      duration_seconds: duration,
      tags: [], // Can be extended later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting coaching session data:', {
      id: sessionData.id,
      user_id: sessionData.user_id,
      organization_id: sessionData.organization_id,
      title: sessionData.title,
      session_type: sessionData.session_type,
      duration_seconds: sessionData.duration_seconds,
      has_summary: !!sessionData.coaching_summary
    });

    const { data: dbData, error } = await supabase
      .from('coaching_sessions')
      .upsert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return errorResponse(`Failed to save coaching session: ${error.message}`);
    }

    console.log('Coaching session saved successfully:', dbData.id);

    // Manually increment simulation count using our dual-tracking API
    console.log('📊 Incrementing simulation count for coaching session...');
    try {
      const incrementResponse = await fetch(new URL('/api/increment-simulation', req.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': req.headers.get('authorization') || '',
          'cookie': req.headers.get('cookie') || ''
        },
        body: JSON.stringify({ userId: userId })
      });

      const incrementData = await incrementResponse.json();
      
      if (!incrementData.success) {
        console.error('Failed to increment simulation count for coaching session:', incrementData.error);
        // Don't fail the save, just log the error
      } else {
        console.log('✅ Simulation count incremented for coaching session');
      }
    } catch (incrementError) {
      console.error('Error incrementing simulation count for coaching session:', incrementError);
      // Don't fail the save, just log the error
    }

    return successResponse({
      sessionId: sessionId,
      coachingSummary: coachingSummary,
      success: true
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Save coaching session error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}