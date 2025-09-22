import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { CallScoringEngine } from '@/lib/ai-engine/core/scoring-engine';
import { TranscriptAnalyzer } from '@/lib/ai-engine/utils/transcript-analyzer';
import { ContextExtractor } from '@/lib/ai-engine/utils/context-extractor';
import { MetricsCalculator } from '@/lib/ai-engine/utils/metrics-calculator';
import { CallType } from '@/lib/ai-engine/types/prospect-types';
import { CallTranscript } from '@/lib/types';

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
      transcript,
      callType = 'discovery-outbound' as CallType,
      personaLevel = 'manager',
      includeDetailedAnalysis = true,
      historicalScores = []
    } = body;

    // Validate required fields
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return errorResponse('transcript is required and must be a non-empty array');
    }

    // Create scoring engine
    const scoringEngine = new CallScoringEngine(transcript, callType);
    
    // Get comprehensive score
    const callScore = await scoringEngine.scoreCall();
    
    // Additional analysis if requested
    let additionalAnalysis = {};
    
    if (includeDetailedAnalysis) {
      // Create analyzers
      const transcriptAnalyzer = new TranscriptAnalyzer(transcript);
      const contextExtractor = new ContextExtractor(transcript);
      
      // Get conversation summary
      const summary = transcriptAnalyzer.generateSummary();
      
      // Extract business context
      const businessContext = contextExtractor.extractBusinessContext();
      const productContext = contextExtractor.extractProductContext();
      const keyInsights = contextExtractor.extractKeyInsights();
      
      // Analyze conversation flow
      const flowAnalysis = transcriptAnalyzer.analyzeCallFlow();
      
      // Calculate performance trends if historical data provided
      let trends = null;
      if (historicalScores.length > 0) {
        trends = MetricsCalculator.calculateTrends(
          callScore.overallScore,
          historicalScores
        );
      }
      
      // Generate performance insights
      const performanceInsights = historicalScores.length > 0
        ? MetricsCalculator.generatePerformanceInsights(
            historicalScores.map((score, index) => ({
              date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
              score,
              callType
            }))
          )
        : null;
      
      additionalAnalysis = {
        summary,
        businessContext,
        productContext,
        keyInsights,
        flowAnalysis,
        trends,
        performanceInsights
      };
    }
    
    // Calculate metric breakdown
    const metricBreakdown = MetricsCalculator.generateMetricBreakdown(callScore);
    
    // Identify top improvement areas
    const improvementPlan = MetricsCalculator.identifyTopImprovementAreas(callScore);
    
    // Build comprehensive response
    const result = {
      // Core scoring
      overallScore: callScore.overallScore,
      scoreBreakdown: metricBreakdown,
      
      // Detailed metrics
      metrics: {
        talkRatio: {
          score: callScore.breakdown.talkRatio.score,
          repTalkPercentage: callScore.detailedAnalysis.talkRatio.repTalkPercentage,
          analysis: callScore.breakdown.talkRatio.feedback[0],
          segments: callScore.detailedAnalysis.talkRatio.segments
        },
        discovery: {
          score: callScore.breakdown.discovery.score,
          questionCount: callScore.detailedAnalysis.discovery.totalQuestions,
          openQuestionRatio: callScore.detailedAnalysis.discovery.openQuestionRatio,
          depth: callScore.detailedAnalysis.discovery.discoveryDepth,
          strongQuestions: callScore.detailedAnalysis.discovery.strongQuestions
        },
        objectionHandling: {
          score: callScore.breakdown.objectionHandling.score,
          totalObjections: callScore.detailedAnalysis.objectionHandling.totalObjections,
          successRate: callScore.detailedAnalysis.objectionHandling.successRate,
          techniques: callScore.detailedAnalysis.objectionHandling.techniques,
          examples: callScore.detailedAnalysis.objectionHandling.objectionTypes
        },
        confidence: {
          score: callScore.breakdown.confidence.score,
          analysis: callScore.breakdown.confidence.feedback[0],
          assertiveness: callScore.detailedAnalysis.confidence?.assertiveness || 'moderate'
        },
        cta: {
          score: callScore.breakdown.cta.score,
          present: callScore.detailedAnalysis.cta.ctaPresent,
          quality: callScore.detailedAnalysis.cta.ctaQuality,
          specificity: callScore.detailedAnalysis.cta.specificity,
          nextSteps: callScore.detailedAnalysis.cta.ctaText
        }
      },
      
      // Insights and feedback
      strengths: callScore.strengths,
      improvements: callScore.improvements,
      improvementPlan,
      
      // Coaching feedback
      coaching: {
        summary: callScore.coachingFeedback.summary,
        topStrengths: callScore.coachingFeedback.strengths.slice(0, 3),
        priorityImprovements: callScore.coachingFeedback.improvements
          .filter(i => i.priority === 'high')
          .slice(0, 3),
        missedOpportunities: callScore.coachingFeedback.missedOpportunities,
        nextCallPrep: callScore.coachingFeedback.nextCallPrep,
        practiceRecommendations: callScore.coachingFeedback.practiceRecommendations
      },
      
      // Methodology analysis
      methodology: {
        detected: callScore.detailedAnalysis.methodology?.detected || 'None',
        adherence: callScore.detailedAnalysis.methodology?.adherence || 0
      },
      
      // Sentiment analysis
      sentiment: {
        overall: callScore.detailedAnalysis.sentiment?.overall || 'neutral',
        progression: callScore.detailedAnalysis.sentiment?.progression || [],
        closingSentiment: callScore.detailedAnalysis.sentiment?.closingSentiment || 'neutral'
      },
      
      // Additional analysis if requested
      ...(includeDetailedAnalysis && { additionalAnalysis }),
      
      // Metadata
      metadata: {
        callType,
        personaLevel,
        transcriptLength: transcript.length,
        estimatedDuration: MetricsCalculator.calculateCallDuration(transcript),
        scoredAt: new Date().toISOString()
      }
    };

    return successResponse(result, 200, corsHeaders);

  } catch (error) {
    console.error('Score call V2 error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}