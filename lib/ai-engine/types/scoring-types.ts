// Call Scoring and Analysis Types

export interface ScoringMetric {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  details: any;
  feedback: string[];
  examples?: Array<{
    timestamp: string;
    text: string;
    issue?: string;
  }>;
}

export interface TalkRatioAnalysis {
  repTalkPercentage: number;
  prospectTalkPercentage: number;
  idealRange: {
    min: number;
    max: number;
  };
  isOptimal: boolean;
  segments: Array<{
    startTime: number;
    endTime: number;
    speaker: 'rep' | 'prospect';
    duration: number;
  }>;
  monologues: Array<{
    speaker: 'rep' | 'prospect';
    startTime: number;
    duration: number;
    content: string;
  }>;
}

export interface DiscoveryQualityAnalysis {
  totalQuestions: number;
  openQuestions: number;
  closedQuestions: number;
  openQuestionRatio: number;
  questionCategories: {
    situation: number;
    problem: number;
    implication: number;
    needPayoff: number;
    other: number;
  };
  discoveryDepth: 'surface' | 'moderate' | 'deep';
  missedOpportunities: string[];
  strongQuestions: Array<{
    question: string;
    category: string;
    impact: string;
  }>;
  weakQuestions: Array<{
    question: string;
    issue: string;
    suggestion: string;
  }>;
}

export interface ObjectionHandlingAnalysis {
  totalObjections: number;
  handledSuccessfully: number;
  successRate: number;
  objectionTypes: Array<{
    type: string;
    objection: string;
    response: string;
    handled: boolean;
    technique: string;
    effectiveness: 'poor' | 'fair' | 'good' | 'excellent';
  }>;
  missedObjections: string[];
  techniques: {
    acknowledge: number;
    clarify: number;
    respond: number;
    confirm: number;
  };
}

export interface CTAAnalysis {
  ctaPresent: boolean;
  ctaQuality: 'none' | 'weak' | 'moderate' | 'strong';
  specificity: 'vague' | 'somewhat-specific' | 'very-specific';
  mutualAgreement: boolean;
  timeline: boolean;
  participants: boolean;
  agenda: boolean;
  ctaText?: string;
  prospectResponse?: string;
  followUpClarity: number; // 0-10
}

export interface ConfidenceAnalysis {
  overallConfidence: number; // 0-100
  vocaFactors: {
    pace: 'too-slow' | 'optimal' | 'too-fast';
    volume: 'too-quiet' | 'optimal' | 'too-loud';
    fillerWords: number;
    hesitations: number;
    uptalk: number;
  };
  languageFactors: {
    certaintyLanguage: number;
    hedgingPhrases: number;
    assertiveness: number;
    professionalTone: number;
  };
  presenceIndicators: {
    controlOfConversation: number; // 0-10
    activeListening: number; // 0-10
    adaptability: number; // 0-10
  };
}

export interface SentimentAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  sentimentProgression: Array<{
    phase: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    timestamp: string;
  }>;
  rapportIndicators: {
    mirroring: number;
    acknowledgments: number;
    personalConnection: number;
    humor: number;
  };
  tensionPoints: Array<{
    timestamp: string;
    trigger: string;
    resolution: boolean;
  }>;
  closingSentiment: 'positive' | 'neutral' | 'negative';
}

export interface MethodologyAnalysis {
  detectedMethodology: 'SPIN' | 'Challenger' | 'MEDDIC' | 'Solution' | 'Consultative' | 'Mixed' | 'None';
  methodologyAdherence: number; // 0-100
  methodologyBreakdown: {
    [key: string]: {
      detected: boolean;
      examples: string[];
      score: number;
    };
  };
  recommendations: string[];
}

export interface CallScore {
  overallScore: number; // 0-100
  breakdown: {
    talkRatio: ScoringMetric;
    discovery: ScoringMetric;
    objectionHandling: ScoringMetric;
    confidence: ScoringMetric;
    cta: ScoringMetric;
  };
  detailedAnalysis: {
    talkRatio: TalkRatioAnalysis;
    discovery: DiscoveryQualityAnalysis;
    objectionHandling: ObjectionHandlingAnalysis;
    cta: CTAAnalysis;
    confidence: ConfidenceAnalysis;
    sentiment: SentimentAnalysis;
    methodology: MethodologyAnalysis;
  };
  strengths: string[];
  improvements: string[];
  coachingFeedback: CoachingFeedback;
  trends?: {
    comparedToAverage: number;
    improvement: number;
    consistencyScore: number;
  };
}

export interface CoachingFeedback {
  summary: string;
  strengths: Array<{
    category: string;
    observation: string;
    example: string;
    timestamp?: string;
  }>;
  improvements: Array<{
    category: string;
    issue: string;
    suggestion: string;
    example: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  missedOpportunities: Array<{
    moment: string;
    whatHappened: string;
    suggestion: string;
    impact: string;
  }>;
  nextCallPrep: Array<{
    topic: string;
    action: string;
    rationale: string;
  }>;
  practiceRecommendations: Array<{
    skill: string;
    exercise: string;
    targetMetric: string;
  }>;
}

export interface ScoringRubric {
  metric: string;
  criteria: Array<{
    score: number;
    description: string;
    examples: string[];
  }>;
  weight: number;
  benchmarks: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
}

export interface PerformanceTrend {
  metric: string;
  scores: Array<{
    date: string;
    score: number;
    callId: string;
  }>;
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  volatility: number;
}