// Enhanced AI Coaching Service - Provides detailed, in-depth coaching feedback

import { openai } from '@/lib/api-utils';
import { AI_MODEL_CONFIG } from '../config/ai-model-config';
import { EnhancedCoachingFeedback, DetailedAnalysisRequest } from '../types/enhanced-coaching-types';

export class EnhancedCoachingService {
  
  /**
   * Generate comprehensive coaching feedback with multiple AI analysis passes
   */
  async generateDetailedCoaching(request: DetailedAnalysisRequest): Promise<EnhancedCoachingFeedback> {
    try {
      // Format transcript for analysis
      const transcriptText = this.formatTranscript(request.transcript);
      
      // Run parallel AI analyses for different aspects
      const [
        conversationAnalysis,
        discoveryAnalysis,
        objectionAnalysis,
        communicationAnalysis,
        valueAnalysis,
        psychologicalAnalysis
      ] = await Promise.all([
        this.analyzeConversationFlow(transcriptText, request.scenarioContext),
        this.analyzeDiscoveryQuality(transcriptText),
        this.analyzeObjectionHandling(transcriptText),
        this.analyzeCommunicationSkills(transcriptText),
        this.analyzeValueDemonstration(transcriptText),
        this.analyzeProspectPsychology(transcriptText)
      ]);

      // Generate executive summary and coaching recommendations
      const executiveSummary = await this.generateExecutiveSummary(
        transcriptText, 
        conversationAnalysis, 
        request.repProfile
      );

      const coachingRecommendations = await this.generateDetailedCoaching(
        transcriptText,
        { conversationAnalysis, discoveryAnalysis, objectionAnalysis, communicationAnalysis, valueAnalysis },
        request.repProfile
      );

      // Combine all analyses into comprehensive feedback
      return this.combineAnalyses({
        executiveSummary,
        conversationAnalysis,
        discoveryAnalysis,
        objectionAnalysis,
        communicationAnalysis,
        valueAnalysis,
        psychologicalAnalysis,
        coachingRecommendations,
        request
      });

    } catch (error) {
      console.error('Enhanced coaching analysis failed:', error);
      throw new Error('Failed to generate detailed coaching feedback');
    }
  }

  private formatTranscript(transcript: any[]): string {
    return transcript
      .map((turn, index) => `[${index + 1}] ${turn.speaker.toUpperCase()}: ${turn.message}`)
      .join('\n\n');
  }

  private async analyzeConversationFlow(transcript: string, context?: any): Promise<any> {
    const prompt = `You are an expert sales trainer analyzing conversation flow and phase management. 

TRANSCRIPT:
${transcript}

CONTEXT: ${context ? JSON.stringify(context) : 'No specific context provided'}

Analyze the conversation flow and provide a detailed assessment in JSON format:

{
  "phases": [
    {
      "name": "opening|discovery|presentation|objection_handling|closing",
      "startLine": <number>,
      "endLine": <number>,
      "duration": <percentage_of_call>,
      "score": <0-100>,
      "summary": "<detailed phase summary>",
      "keyMoments": [
        {
          "line": <number>,
          "type": "breakthrough|missed_opportunity|tension|rapport_building",
          "text": "<actual quote>",
          "analysis": "<detailed analysis of what happened>",
          "coaching_note": "<specific coaching advice>",
          "impact": "<impact on deal progression>"
        }
      ],
      "strengths": ["<specific strength with line reference>"],
      "improvements": ["<specific improvement with suggestion>"]
    }
  ],
  "transitionQuality": {
    "score": <0-100>,
    "smooth_transitions": <count>,
    "abrupt_transitions": <count>,
    "examples": ["<example of good/bad transition>"]
  },
  "pacing": {
    "overall": "too_slow|optimal|too_fast",
    "discovery_phase": "too_short|appropriate|too_long",
    "presentation_phase": "too_short|appropriate|too_long",
    "closing_phase": "too_short|appropriate|too_long"
  },
  "control": {
    "rep_control_score": <0-100>,
    "prospect_engagement_score": <0-100>,
    "conversation_direction": "rep_led|collaborative|prospect_led",
    "agenda_adherence": <0-100>
  }
}

Focus on specific moments, exact quotes, and actionable coaching insights.`;

    const response = await this.callOpenAI(prompt, 'conversation-flow');
    return this.parseAIResponse(response);
  }

  private async analyzeDiscoveryQuality(transcript: string): Promise<any> {
    const prompt = `You are an expert in sales discovery methodology, analyzing questioning techniques and information gathering.

TRANSCRIPT:
${transcript}

Provide a comprehensive discovery analysis in JSON format:

{
  "questioning_technique": {
    "spin_methodology": {
      "situation": {
        "count": <number>,
        "examples": ["<actual question from transcript>"],
        "quality": "poor|fair|good|excellent",
        "depth_level": "surface|moderate|deep",
        "suggestions": ["<specific improvement suggestion>"],
        "missed_opportunities": ["<what should have been asked>"]
      },
      "problem": {
        "count": <number>,
        "examples": ["<actual question from transcript>"],
        "quality": "poor|fair|good|excellent",
        "emotional_connection": <0-100>,
        "business_impact_explored": <boolean>,
        "suggestions": ["<specific improvement suggestion>"]
      },
      "implication": {
        "count": <number>,
        "examples": ["<actual question from transcript>"],
        "quality": "poor|fair|good|excellent",
        "cost_impact_explored": <boolean>,
        "revenue_impact_explored": <boolean>,
        "suggestions": ["<specific improvement suggestion>"]
      },
      "need_payoff": {
        "count": <number>,
        "examples": ["<actual question from transcript>"],
        "quality": "poor|fair|good|excellent",
        "vision_building": <boolean>,
        "value_articulation": <0-100>,
        "suggestions": ["<specific improvement suggestion>"]
      }
    },
    "question_flow": {
      "logical_progression": <boolean>,
      "building_on_answers": <boolean>,
      "follow_up_quality": "poor|fair|good|excellent",
      "depth_vs_breadth": "too_shallow|balanced|too_deep",
      "examples_of_good_flow": ["<example>"],
      "examples_of_poor_flow": ["<example>"]
    }
  },
  "pain_point_discovery": {
    "identified_pains": [
      {
        "pain": "<pain point identified>",
        "line_number": <where_mentioned>,
        "exploration_depth": "surface|moderate|deep",
        "business_impact": "none|implied|quantified",
        "emotional_resonance": "low|medium|high",
        "coaching_note": "<how to explore this better>"
      }
    ],
    "missed_signals": [
      {
        "signal": "<prospect hint not explored>",
        "line_number": <number>,
        "suggested_follow_up": "<what should have been asked>"
      }
    ]
  },
  "business_impact_analysis": {
    "revenue_impact_discussed": <boolean>,
    "cost_impact_discussed": <boolean>,
    "time_impact_discussed": <boolean>,
    "strategic_impact_discussed": <boolean>,
    "quantification_level": "none|rough|specific",
    "business_case_strength": <0-100>,
    "metrics_gathered": ["<specific metric or number mentioned>"],
    "missing_metrics": ["<important metrics not explored>"]
  },
  "stakeholder_discovery": {
    "decision_makers_identified": <boolean>,
    "influencers_identified": <boolean>,
    "process_understood": <boolean>,
    "timeline_discovered": <boolean>,
    "budget_discussed": <boolean>,
    "gaps": ["<missing stakeholder information>"]
  }
}

Be extremely specific with line references and actual quotes.`;

    const response = await this.callOpenAI(prompt, 'discovery-analysis');
    return this.parseAIResponse(response);
  }

  private async analyzeObjectionHandling(transcript: string): Promise<any> {
    const prompt = `You are an expert in objection handling, analyzing resistance management and persuasion techniques.

TRANSCRIPT:
${transcript}

Analyze objection handling with detailed techniques assessment:

{
  "objections_by_type": {
    "budget": [
      {
        "objection_text": "<exact prospect quote>",
        "line_number": <number>,
        "rep_response": "<exact rep response>",
        "response_line": <number>,
        "technique_used": ["acknowledge|clarify|respond|confirm|isolate|empathy"],
        "effectiveness_score": <0-100>,
        "what_worked": "<specific positive elements>",
        "what_failed": "<specific negative elements>",
        "improvement_suggestion": "<detailed suggestion>",
        "better_response_example": "<example of stronger response>",
        "emotional_handling": "poor|fair|good|excellent"
      }
    ],
    "timing": [<same structure>],
    "authority": [<same structure>],
    "need": [<same structure>],
    "competitive": [<same structure>],
    "other": [<same structure>]
  },
  "prevention_analysis": {
    "objections_that_could_have_been_prevented": [
      {
        "objection": "<objection text>",
        "prevention_opportunity": "<where in discovery this could have been addressed>",
        "prevention_technique": "<specific technique to prevent>"
      }
    ]
  },
  "technique_analysis": {
    "acknowledge_used": <boolean>,
    "acknowledge_examples": ["<example>"],
    "clarify_used": <boolean>,
    "clarify_examples": ["<example>"],
    "respond_used": <boolean>,
    "respond_quality": "defensive|factual|value_focused|strategic",
    "confirm_used": <boolean>,
    "isolate_used": <boolean>,
    "empathy_demonstrated": <boolean>,
    "evidence_provided": <boolean>,
    "evidence_quality": "weak|moderate|strong",
    "overall_technique_score": <0-100>
  },
  "psychological_analysis": {
    "rep_confidence_under_pressure": <0-100>,
    "emotional_regulation": "poor|fair|good|excellent",
    "rapport_maintenance": <0-100>,
    "persuasion_approach": "logical|emotional|authority|social_proof|mixed",
    "adaptability": <0-100>
  }
}

Focus on specific techniques, emotional intelligence, and persuasion psychology.`;

    const response = await this.callOpenAI(prompt, 'objection-analysis');
    return this.parseAIResponse(response);
  }

  private async analyzeCommunicationSkills(transcript: string): Promise<any> {
    const prompt = `You are an expert in sales communication, analyzing language patterns, listening skills, and executive presence.

TRANSCRIPT:
${transcript}

Provide detailed communication analysis:

{
  "tonal_analysis": {
    "confidence": <0-100>,
    "confidence_indicators": ["<specific examples>"],
    "confidence_detractors": ["<specific examples>"],
    "enthusiasm": <0-100>,
    "enthusiasm_examples": ["<specific examples>"],
    "empathy": <0-100>,
    "empathy_examples": ["<specific examples>"],
    "professionalism": <0-100>,
    "professionalism_examples": ["<specific examples>"],
    "authenticity": <0-100>,
    "authenticity_assessment": "<detailed assessment>"
  },
  "language_patterns": {
    "filler_words": {
      "count": <total_count>,
      "types_and_frequency": {"um": <count>, "like": <count>, "you know": <count>},
      "impact_on_credibility": "low|medium|high",
      "specific_lines": ["<line numbers where filler words appear>"]
    },
    "power_language": {
      "used": <boolean>,
      "examples": ["<strong language examples>"],
      "suggestions": ["<power words to incorporate>"]
    },
    "weak_language": {
      "used": <boolean>,
      "examples": ["<weak language examples>"],
      "hedging_phrases": ["<hedging examples>"],
      "alternatives": ["<stronger alternatives>"]
    },
    "jargon_usage": {
      "appropriate": <boolean>,
      "examples": ["<jargon used>"],
      "suggestions": ["<simplification suggestions>"]
    },
    "clarity_score": <0-100>
  },
  "listening_skills": {
    "interruption_count": <number>,
    "interruption_examples": ["<line number and context>"],
    "pause_for_responses": <boolean>,
    "acknowledgment_responses": <count>,
    "acknowledgment_examples": ["<example>"],
    "clarifying_questions": <count>,
    "clarifying_examples": ["<example>"],
    "summary_statements": <count>,
    "summary_quality": "poor|fair|good|excellent",
    "active_listening_score": <0-100>
  },
  "executive_presence": {
    "conversation_control": <0-100>,
    "agenda_management": <0-100>,
    "meeting_leadership": <0-100>,
    "assertiveness": <0-100>,
    "adaptability": <0-100>,
    "thought_leadership": <0-100>,
    "presence_indicators": ["<specific examples>"],
    "presence_gaps": ["<areas for improvement>"]
  },
  "rapport_building": {
    "mirroring_used": <boolean>,
    "mirroring_examples": ["<example>"],
    "personal_connection": <boolean>,
    "personal_examples": ["<example>"],
    "humor_used": <boolean>,
    "humor_appropriateness": "inappropriate|appropriate|effective",
    "rapport_score": <0-100>
  }
}

Be specific about line numbers and exact quotes demonstrating each skill.`;

    const response = await this.callOpenAI(prompt, 'communication-analysis');
    return this.parseAIResponse(response);
  }

  private async analyzeValueDemonstration(transcript: string): Promise<any> {
    const prompt = `You are an expert in value selling, analyzing value proposition delivery and benefit articulation.

TRANSCRIPT:
${transcript}

Analyze value demonstration techniques:

{
  "features_vs_benefits": {
    "features_only_statements": [
      {
        "statement": "<exact quote>",
        "line_number": <number>,
        "suggested_benefit": "<how to convert to benefit>"
      }
    ],
    "benefits_linked_statements": [
      {
        "statement": "<exact quote>",
        "line_number": <number>,
        "benefit_type": "functional|emotional|business|personal",
        "quality": "weak|moderate|strong"
      }
    ],
    "business_value_linked": [
      {
        "statement": "<exact quote>",
        "line_number": <number>,
        "business_impact": "revenue|cost|efficiency|risk|competitive",
        "quantification": "none|rough|specific"
      }
    ]
  },
  "storytelling": {
    "stories_used": <count>,
    "story_analysis": [
      {
        "story_summary": "<story summary>",
        "line_start": <number>,
        "relevance": "low|medium|high",
        "emotional_connection": <boolean>,
        "specific_metrics": <boolean>,
        "similar_situation": <boolean>,
        "credibility": "low|medium|high",
        "improvement_suggestions": ["<suggestion>"]
      }
    ]
  },
  "evidence_provided": {
    "case_studies": <count>,
    "testimonials": <count>,
    "data_points": <count>,
    "demonstrations": <count>,
    "credibility_level": "low|medium|high",
    "evidence_examples": [
      {
        "type": "case_study|testimonial|data|demo",
        "content": "<evidence provided>",
        "line_number": <number>,
        "impact": "weak|moderate|strong"
      }
    ]
  },
  "customization": {
    "generic_pitch_elements": ["<generic statements>"],
    "tailored_elements": ["<tailored statements>"],
    "industry_specific": <boolean>,
    "role_specific": <boolean>,
    "company_specific": <boolean>,
    "customization_score": <0-100>,
    "personalization_opportunities": ["<missed personalization opportunities>"]
  },
  "roi_and_justification": {
    "roi_discussed": <boolean>,
    "payback_period_mentioned": <boolean>,
    "cost_justification": <boolean>,
    "risk_mitigation": <boolean>,
    "competitive_advantage": <boolean>,
    "business_case_strength": <0-100>
  }
}

Focus on specific value articulation techniques and missed opportunities.`;

    const response = await this.callOpenAI(prompt, 'value-analysis');
    return this.parseAIResponse(response);
  }

  private async analyzeProspectPsychology(transcript: string): Promise<any> {
    const prompt = `You are an expert in buyer psychology and personality assessment, analyzing prospect behavior and motivations.

TRANSCRIPT:
${transcript}

Analyze prospect psychology and provide coaching on adaptation:

{
  "prospect_personality": {
    "communication_style": "analytical|expressive|amiable|driver",
    "decision_making_style": "consensus|individual|data_driven|intuitive",
    "risk_tolerance": "conservative|moderate|aggressive",
    "pace_preference": "fast|moderate|deliberate",
    "detail_orientation": "high|medium|low",
    "relationship_importance": "high|medium|low",
    "evidence_from_transcript": ["<specific examples supporting assessment>"]
  },
  "motivators": {
    "primary_motivators": ["achievement|recognition|security|growth|autonomy"],
    "pain_motivators": ["<what they want to avoid>"],
    "gain_motivators": ["<what they want to achieve>"],
    "evidence": ["<transcript evidence for each motivator>"]
  },
  "concerns_and_barriers": {
    "expressed_concerns": ["<stated concerns>"],
    "implied_concerns": ["<unstated but evident concerns>"],
    "change_resistance": "low|medium|high",
    "risk_concerns": ["<specific risks they're worried about>"],
    "political_concerns": ["<internal political considerations>"]
  },
  "buying_signals": {
    "positive_signals": ["<positive buying signals observed>"],
    "negative_signals": ["<concerning signals>"],
    "engagement_level": <0-100>,
    "commitment_indicators": ["<signs of commitment>"],
    "hesitation_indicators": ["<signs of hesitation>"]
  },
  "adaptation_recommendations": {
    "communication_adjustments": ["<how to adapt communication style>"],
    "pace_adjustments": ["<how to adjust pace>"],
    "content_adjustments": ["<what type of content to emphasize>"],
    "relationship_building": ["<how to build rapport with this personality>"],
    "decision_process_alignment": ["<how to align with their decision process>"]
  }
}

Provide deep psychological insights and specific adaptation strategies.`;

    const response = await this.callOpenAI(prompt, 'psychology-analysis');
    return this.parseAIResponse(response);
  }

  private async generateExecutiveSummary(
    transcript: string, 
    conversationAnalysis: any, 
    repProfile?: any
  ): Promise<any> {
    const prompt = `You are a senior sales director providing an executive summary of this sales call performance.

TRANSCRIPT:
${transcript}

CONVERSATION ANALYSIS:
${JSON.stringify(conversationAnalysis)}

REP PROFILE: ${repProfile ? JSON.stringify(repProfile) : 'No profile provided'}

Provide an executive summary:

{
  "overall_performance": "<2-3 sentence executive summary>",
  "deal_probability": <0-100>,
  "deal_probability_rationale": "<why this probability>",
  "top_strengths": [
    "<most impressive aspect of performance>",
    "<second strongest element>",
    "<third strength>"
  ],
  "critical_areas": [
    "<most important area for improvement>",
    "<second critical area>",
    "<third critical area>"
  ],
  "business_impact": "<impact on potential deal success>",
  "next_call_success_factors": ["<key factors for next call success>"],
  "manager_action_required": <boolean>,
  "manager_action_suggestions": ["<if manager intervention needed>"]
}

Focus on business impact and deal progression.`;

    const response = await this.callOpenAI(prompt, 'executive-summary');
    return this.parseAIResponse(response);
  }

  private async generateDetailedCoaching(
    transcript: string,
    analyses: any,
    repProfile?: any
  ): Promise<any> {
    const prompt = `You are an expert sales coach providing detailed, actionable coaching recommendations.

TRANSCRIPT:
${transcript}

ANALYSES:
${JSON.stringify(analyses)}

REP PROFILE: ${repProfile ? JSON.stringify(repProfile) : 'No profile provided'}

Generate comprehensive coaching:

{
  "immediate_actions": [
    {
      "action": "<specific action to take>",
      "rationale": "<why this action>",
      "timeframe": "today|this_week|next_call",
      "difficulty": "easy|medium|hard",
      "expected_impact": "low|medium|high",
      "success_metrics": ["<how to measure success>"]
    }
  ],
  "skill_development": [
    {
      "skill": "<specific skill to develop>",
      "current_level": "beginner|intermediate|advanced",
      "target_level": "intermediate|advanced|expert",
      "practice_exercises": ["<specific exercise>"],
      "time_to_improve": "<realistic timeframe>",
      "success_metrics": ["<measurable improvement indicators>"],
      "resources": ["<books, courses, etc.>"]
    }
  ],
  "scenario_specific_coaching": {
    "what_worked_well": ["<specific successes to replicate>"],
    "what_didnt_work": ["<specific failures to avoid>"],
    "alternate_approaches": ["<different strategies that could work>"],
    "industry_best_practices": ["<relevant best practices>"],
    "competitive_positioning": ["<how to position better against competitors>"]
  },
  "next_call_preparation": {
    "agenda_items": ["<specific agenda items>"],
    "key_questions": ["<questions to ask>"],
    "value_prop_refinement": "<how to refine value proposition>",
    "objection_prep": ["<likely objections and responses>"],
    "materials_needed": ["<sales materials to prepare>"],
    "stakeholder_strategy": ["<stakeholder engagement strategy>"],
    "success_criteria": ["<what success looks like>"]
  },
  "long_term_development": {
    "quarterly_goals": ["<90-day improvement goals>"],
    "annual_aspirations": ["<yearly development targets>"],
    "career_advancement": ["<how this impacts career growth>"],
    "mentoring_recommendations": ["<when to seek additional help>"]
  }
}

Provide specific, actionable, and measurable coaching recommendations.`;

    const response = await this.callOpenAI(prompt, 'detailed-coaching');
    return this.parseAIResponse(response);
  }

  private async callOpenAI(prompt: string, analysisType: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL_CONFIG.analysis.model, // Use the most capable model
        messages: [
          {
            role: 'system',
            content: `You are an expert sales trainer and coach. Provide detailed, specific, and actionable analysis. Always return valid JSON without markdown formatting.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 4000, // Allow for detailed responses
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error(`No response from OpenAI for ${analysisType}`);
      }

      return response;
    } catch (error) {
      console.error(`OpenAI call failed for ${analysisType}:`, error);
      throw error;
    }
  }

  private parseAIResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', response);
      throw new Error('Invalid JSON response from AI');
    }
  }

  private combineAnalyses(data: any): EnhancedCoachingFeedback {
    // Combine all analyses into the final comprehensive feedback structure
    // This is a simplified version - you would map all the detailed analyses
    
    return {
      executiveSummary: data.executiveSummary,
      conversationPhases: data.conversationAnalysis.phases || [],
      deepAnalysis: {
        discovery: data.discoveryAnalysis,
        objectionHandling: data.objectionAnalysis,
        communication: data.communicationAnalysis,
        valueDemonstration: data.valueAnalysis,
        closing: {
          assumptiveTechniques: { used: false, examples: [], effectiveness: 0 },
          trialCloses: { used: false, count: 0, examples: [], prospectResponses: [] },
          commitmentGaining: { asked: false, specific: false, timeline: false, nextSteps: false, mutualCommitment: false, strength: 0 },
          urgencyCreation: { attempted: false, genuine: false, effective: false, techniques: [] }
        },
        competitive: {
          competitorsRaised: [],
          competitiveHandling: { acknowledged: false, redirected: false, differentiated: false, weakness_exploited: false, strength_reinforced: false },
          positioningStrength: 0,
          competitiveBattleCardUsage: false
        }
      },
      keyMoments: data.conversationAnalysis.phases?.flatMap((phase: any) => phase.keyMoments) || [],
      coaching: data.coachingRecommendations,
      nextCallPrep: data.coachingRecommendations.next_call_preparation || {
        agenda: [],
        keyQuestions: [],
        valuePropRefinement: '',
        objectionPrep: [],
        materials: [],
        stakeholders: []
      },
      comparativeBenchmarks: {
        industryAverage: 75,
        topPerformerComparison: [],
        improvementTrajectory: 'Improving',
        skillRanking: []
      }
    };
  }
}