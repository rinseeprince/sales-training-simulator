// Enhanced coaching feedback types for detailed analysis

export interface DetailedMoment {
  timestamp: string;
  speaker: 'rep' | 'prospect';
  text: string;
  analysis: string;
  impact: 'breakthrough' | 'missed_opportunity' | 'tension' | 'rapport_building' | 'value_demonstration';
  coaching_note: string;
}

export interface ConversationPhase {
  name: 'opening' | 'discovery' | 'presentation' | 'objection_handling' | 'closing';
  startTime: string;
  endTime: string;
  duration: number;
  score: number;
  summary: string;
  keyMoments: DetailedMoment[];
  strengths: string[];
  improvements: string[];
}

export interface DeepDiscoveryAnalysis {
  questioningTechnique: {
    spinMethodology: {
      situation: {
        count: number;
        examples: string[];
        quality: 'poor' | 'fair' | 'good' | 'excellent';
        suggestions: string[];
      };
      problem: {
        count: number;
        examples: string[];
        quality: 'poor' | 'fair' | 'good' | 'excellent';
        suggestions: string[];
      };
      implication: {
        count: number;
        examples: string[];
        quality: 'poor' | 'fair' | 'good' | 'excellent';
        suggestions: string[];
      };
      needPayoff: {
        count: number;
        examples: string[];
        quality: 'poor' | 'fair' | 'good' | 'excellent';
        suggestions: string[];
      };
    };
    questionFlow: {
      logicalProgression: boolean;
      buildingOnAnswers: boolean;
      depthVsBreadth: 'too_shallow' | 'balanced' | 'too_deep';
      followUpQuality: 'poor' | 'fair' | 'good' | 'excellent';
    };
  };
  painPointDiscovery: {
    identifiedPains: Array<{
      pain: string;
      exploreDepth: 'surface' | 'moderate' | 'deep';
      businessImpact: 'none' | 'implied' | 'quantified';
      emotionalResonance: 'low' | 'medium' | 'high';
    }>;
    missedSignals: string[];
    explorationSuggestions: string[];
  };
  businessImpactAnalysis: {
    revenueImpactDiscussed: boolean;
    costImpactDiscussed: boolean;
    timeImpactDiscussed: boolean;
    strategicImpactDiscussed: boolean;
    quantificationLevel: 'none' | 'rough' | 'specific';
    businessCaseStrength: number; // 0-100
  };
}

export interface DetailedObjectionAnalysis {
  objectionsByType: {
    budget: Array<{
      objection: string;
      repResponse: string;
      technique: string[];
      effectiveness: number; // 0-100
      improvementSuggestion: string;
      betterResponse: string;
    }>;
    timing: Array<{
      objection: string;
      repResponse: string;
      technique: string[];
      effectiveness: number;
      improvementSuggestion: string;
      betterResponse: string;
    }>;
    authority: Array<{
      objection: string;
      repResponse: string;
      technique: string[];
      effectiveness: number;
      improvementSuggestion: string;
      betterResponse: string;
    }>;
    need: Array<{
      objection: string;
      repResponse: string;
      technique: string[];
      effectiveness: number;
      improvementSuggestion: string;
      betterResponse: string;
    }>;
    other: Array<{
      objection: string;
      repResponse: string;
      technique: string[];
      effectiveness: number;
      improvementSuggestion: string;
      betterResponse: string;
    }>;
  };
  preventionAnalysis: {
    missedPreventionOpportunities: string[];
    preventionSuggestions: string[];
  };
  techniqueAnalysis: {
    acknowledgeUsed: boolean;
    clarifyUsed: boolean;
    respondUsed: boolean;
    confirmUsed: boolean;
    isolateUsed: boolean;
    empathyDemonstrated: boolean;
    evidenceProvided: boolean;
  };
}

export interface CommunicationAnalysis {
  tonalAnalysis: {
    confidence: number; // 0-100
    enthusiasm: number; // 0-100
    empathy: number; // 0-100
    professionalism: number; // 0-100
    authenticity: number; // 0-100
  };
  languagePatterns: {
    fillerWords: {
      count: number;
      types: string[];
      impactOnCredibility: 'low' | 'medium' | 'high';
    };
    powerLanguage: {
      used: boolean;
      examples: string[];
      suggestions: string[];
    };
    weakLanguage: {
      used: boolean;
      examples: string[];
      alternatives: string[];
    };
    jargonUsage: {
      appropriate: boolean;
      examples: string[];
      suggestions: string[];
    };
  };
  listeningSkills: {
    interruptionCount: number;
    pausingForResponses: boolean;
    acknowledgmentResponses: number;
    clarifyingQuestions: number;
    summaryStatements: number;
  };
}

export interface ValueDemonstrationAnalysis {
  featuresVsBenefits: {
    featuresOnly: string[];
    benefitsLinked: string[];
    businessValueLinked: string[];
    personalValueLinked: string[];
  };
  storytelling: {
    storiesUsed: number;
    storyRelevance: 'low' | 'medium' | 'high';
    emotionalConnection: boolean;
    specificMetrics: boolean;
    similarSituations: boolean;
  };
  evidenceProvided: {
    caseStudies: number;
    testimonials: number;
    dataPoints: number;
    demonstrations: number;
    credibilityLevel: 'low' | 'medium' | 'high';
  };
  customization: {
    genericPitch: boolean;
    tailoredToNeeds: boolean;
    industrySpecific: boolean;
    roleSpecific: boolean;
    customizationLevel: number; // 0-100
  };
}

export interface ClosingAnalysis {
  assumptiveTechniques: {
    used: boolean;
    examples: string[];
    effectiveness: number; // 0-100
  };
  trialCloses: {
    used: boolean;
    count: number;
    examples: string[];
    prospectResponses: string[];
  };
  commitmentGaining: {
    asked: boolean;
    specific: boolean;
    timeline: boolean;
    nextSteps: boolean;
    mutualCommitment: boolean;
    strength: number; // 0-100
  };
  urgencyCreation: {
    attempted: boolean;
    genuine: boolean;
    effective: boolean;
    techniques: string[];
  };
}

export interface CompetitiveAnalysis {
  competitorsRaised: string[];
  competitiveHandling: {
    acknowledged: boolean;
    redirected: boolean;
    differentiated: boolean;
    weakness_exploited: boolean;
    strength_reinforced: boolean;
  };
  positioningStrength: number; // 0-100
  competitiveBattleCardUsage: boolean;
}

export interface EnhancedCoachingFeedback {
  executiveSummary: {
    overallPerformance: string;
    topStrengths: string[];
    criticalAreas: string[];
    businessImpact: string;
    dealProbability: number; // 0-100
  };
  
  conversationPhases: ConversationPhase[];
  
  deepAnalysis: {
    discovery: DeepDiscoveryAnalysis;
    objectionHandling: DetailedObjectionAnalysis;
    communication: CommunicationAnalysis;
    valueDemonstration: ValueDemonstrationAnalysis;
    closing: ClosingAnalysis;
    competitive: CompetitiveAnalysis;
  };
  
  keyMoments: DetailedMoment[];
  
  coaching: {
    immediateActions: Array<{
      action: string;
      rationale: string;
      timeframe: 'today' | 'this_week' | 'next_call';
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    
    skillDevelopment: Array<{
      skill: string;
      currentLevel: 'beginner' | 'intermediate' | 'advanced';
      targetLevel: 'intermediate' | 'advanced' | 'expert';
      practiceExercises: string[];
      timeToImprove: string;
      successMetrics: string[];
    }>;
    
    scenarioSpecific: {
      whatWorked: string[];
      whatDidnt: string[];
      alternatApproaches: string[];
      industryBestPractices: string[];
    };
    
    psychologicalInsights: {
      prospectPersonality: string;
      motivators: string[];
      concerns: string[];
      communicationStyle: string;
      adaptationSuggestions: string[];
    };
  };
  
  nextCallPrep: {
    agenda: string[];
    keyQuestions: string[];
    valuePropRefinement: string;
    objectionPrep: string[];
    materials: string[];
    stakeholders: string[];
  };
  
  comparativeBenchmarks: {
    industryAverage: number;
    topPerformerComparison: string[];
    improvementTrajectory: string;
    skillRanking: Array<{
      skill: string;
      currentPercentile: number;
      targetPercentile: number;
    }>;
  };
}

export interface DetailedAnalysisRequest {
  transcript: Array<{
    speaker: 'rep' | 'ai' | 'prospect';
    message: string;
    timestamp?: string;
  }>;
  scenarioContext?: {
    industry: string;
    productType: string;
    dealSize: string;
    salesStage: string;
    competitiveContext: string[];
  };
  repProfile?: {
    experience: 'junior' | 'mid' | 'senior';
    strengths: string[];
    developmentAreas: string[];
    previousCallHistory?: number;
  };
}