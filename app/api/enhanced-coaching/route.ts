import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';
import { EnhancedCoachingService } from '@/lib/ai-engine/services/enhanced-coaching-service';
import { DetailedAnalysisRequest } from '@/lib/ai-engine/types/enhanced-coaching-types';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate environment variables
    validateEnvVars();

    // Parse request body
    const body = await req.json();
    const { transcript, scenarioContext, repProfile } = body;

    // Validate required fields
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return errorResponse('transcript is required and must be a non-empty array');
    }

    // Prepare detailed analysis request
    const analysisRequest: DetailedAnalysisRequest = {
      transcript,
      scenarioContext: scenarioContext || {
        industry: 'General',
        productType: 'Software',
        dealSize: 'Unknown',
        salesStage: 'Discovery',
        competitiveContext: []
      },
      repProfile: repProfile || {
        experience: 'mid',
        strengths: [],
        developmentAreas: []
      }
    };

    // Generate enhanced coaching feedback
    console.log('🎯 Starting enhanced coaching analysis...');
    const coachingService = new EnhancedCoachingService();
    const enhancedFeedback = await coachingService.generateDetailedCoaching(analysisRequest);

    console.log('✅ Enhanced coaching analysis completed');

    // Return comprehensive feedback
    return successResponse({
      enhancedCoaching: enhancedFeedback,
      analysisType: 'enhanced',
      timestamp: new Date().toISOString(),
      metrics: {
        transcriptLength: transcript.length,
        analysisDepth: 'comprehensive',
        aiModel: 'gpt-4'
      }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Enhanced coaching error:', error);
    
    // Provide fallback basic analysis if enhanced analysis fails
    const fallbackResponse = {
      enhancedCoaching: {
        executiveSummary: {
          overallPerformance: 'Analysis temporarily unavailable. Basic feedback provided.',
          topStrengths: ['Call completed successfully'],
          criticalAreas: ['Detailed analysis unavailable'],
          businessImpact: 'Unable to assess impact without detailed analysis',
          dealProbability: 50
        },
        conversationPhases: [],
        deepAnalysis: {
          discovery: { questioning_technique: null, pain_point_discovery: null, business_impact_analysis: null },
          objectionHandling: { objections_by_type: {}, prevention_analysis: null, technique_analysis: null },
          communication: { tonal_analysis: null, language_patterns: null, listening_skills: null },
          valueDemonstration: { features_vs_benefits: null, storytelling: null, evidence_provided: null, customization: null },
          closing: { assumptiveTechniques: { used: false, examples: [], effectiveness: 0 }, trialCloses: { used: false, count: 0, examples: [], prospectResponses: [] }, commitmentGaining: { asked: false, specific: false, timeline: false, nextSteps: false, mutualCommitment: false, strength: 0 }, urgencyCreation: { attempted: false, genuine: false, effective: false, techniques: [] } },
          competitive: { competitorsRaised: [], competitiveHandling: { acknowledged: false, redirected: false, differentiated: false, weakness_exploited: false, strength_reinforced: false }, positioningStrength: 0, competitiveBattleCardUsage: false }
        },
        keyMoments: [],
        coaching: {
          immediateActions: [{
            action: 'Review call recording for self-assessment',
            rationale: 'Detailed AI analysis temporarily unavailable',
            timeframe: 'today',
            difficulty: 'easy'
          }],
          skillDevelopment: [],
          scenarioSpecific: {
            whatWorked: ['Call was completed'],
            whatDidnt: ['Detailed analysis unavailable'],
            alternatApproaches: [],
            industryBestPractices: []
          },
          psychologicalInsights: {
            prospectPersonality: 'Unable to assess',
            motivators: [],
            concerns: [],
            communicationStyle: 'Unknown',
            adaptationSuggestions: []
          }
        },
        nextCallPrep: {
          agenda: [],
          keyQuestions: [],
          valuePropRefinement: '',
          objectionPrep: [],
          materials: [],
          stakeholders: []
        },
        comparativeBenchmarks: {
          industryAverage: 0,
          topPerformerComparison: [],
          improvementTrajectory: 'Unknown',
          skillRanking: []
        }
      },
      analysisType: 'fallback',
      error: error instanceof Error ? error.message : 'Analysis failed'
    };

    return successResponse(fallbackResponse, 200, corsHeaders);
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}