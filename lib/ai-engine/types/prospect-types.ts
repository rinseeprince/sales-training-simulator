// AI Prospect Engine Types

export type PersonaLevel = 'junior' | 'manager' | 'director' | 'vp' | 'c-level';
export type CallType = 'discovery-outbound' | 'discovery-inbound' | 'objection-handling' | 'elevator-pitch';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type Sentiment = 'friendly' | 'neutral' | 'skeptical' | 'hostile';

export interface PersonaConfig {
  level: PersonaLevel;
  title?: string;
  department?: string;
  yearsInRole?: number;
  personalityTraits?: string[];
  communicationStyle?: string;
  decisionMakingAuthority?: string;
  priorities?: string[];
  painPoints?: string[];
  objectionStyle?: string;
}

export interface PersonaDefinition {
  level: PersonaLevel;
  titles: string[];
  rolesResponsibilities: string[];
  priorities: string[];
  communicationStyle: string;
  decisionMaking: string;
  commonObjections: string[];
  informationSharing: string;
  budgetAuthority: string;
  typicalConcerns: string[];
}

export interface CallTypeConfig {
  type: CallType;
  context: string;
  prospectBehavior: string;
  aiResponsePattern: string;
  successCriteria: string[];
  objectionTypes: string[];
  informationSharing: string;
  expectedDuration: number; // in minutes
}

export interface DifficultyModifier {
  level: DifficultyLevel;
  name: string;
  description: string;
  cooperationLevel: number; // 0-1
  informationSharingLevel: number; // 0-1
  objectionFrequency: number; // 0-1
  trustBuildingRequired: number; // 0-1
  responseDelay: number; // milliseconds
}

export interface BusinessContext {
  companyName: string;
  industry: string;
  companySize: string;
  annualRevenue?: string;
  currentChallenges: string[];
  existingSolutions: string[];
  budgetRange?: string;
  decisionTimeframe?: string;
  competitors?: string[];
  recentInitiatives?: string[];
}

export interface ProductContext {
  productName: string;
  category: string;
  valuePropositions: string[];
  keyFeatures: string[];
  pricing?: string;
  competitiveAdvantages: string[];
  commonUseCases: string[];
  integrations?: string[];
  implementation?: string;
}

export interface ScenarioContext {
  businessContext: BusinessContext;
  productContext: ProductContext;
  personaConfig: PersonaConfig;
  callType: CallType;
  difficulty: DifficultyLevel;
  specificObjections?: string[];
  hiddenNeeds?: string[];
  successMetrics?: string[];
}

export interface ConversationState {
  currentPhase: 'opening' | 'discovery' | 'value-prop' | 'objection-handling' | 'closing';
  rapportLevel: number; // 0-1
  trustLevel: number; // 0-1
  engagementLevel: number; // 0-1
  objectionsSurfaced: string[];
  painPointsDiscovered: string[];
  valuePropsPresented: string[];
  questionsAsked: string[];
  commitmentsGiven: string[];
  nextStepsDiscussed: boolean;
  budgetDiscussed: boolean;
  timelineDiscussed: boolean;
  decisionMakersIdentified: boolean;
}

export interface RevealedInformation {
  company?: {
    name?: string;
    size?: string;
    industry?: string;
    challenges?: string[];
  };
  personal?: {
    role?: string;
    priorities?: string[];
    concerns?: string[];
  };
  budget?: {
    range?: string;
    authority?: boolean;
    timeline?: string;
  };
}

export interface ProspectResponse {
  message: string;
  sentiment: Sentiment;
  revealedInformation?: RevealedInformation;
  raisedObjection?: string;
  emotionalTone?: string;
  bodyLanguageCues?: string[]; // For future video integration
  conversationPhaseShift?: string;
}

export interface ProspectMemory {
  conversationHistory: Array<{
    speaker: 'rep' | 'prospect';
    message: string;
    timestamp: string;
    phase: string;
  }>;
  revealedInformation: {
    company: RevealedInformation['company'];
    personal: RevealedInformation['personal'];
    challenges: string[];
    goals: string[];
    budget: RevealedInformation['budget'];
    timeline: {
      urgency?: string;
      deadline?: string;
      seasonality?: string;
    };
    decisionProcess: {
      stakeholders?: string[];
      criteria?: string[];
      timeline?: string;
    };
  };
  repTactics: {
    questionsAsked: string[];
    valuePropsUsed: string[];
    objectionHandlingApproaches: string[];
    closingAttempts: number;
  };
  emotionalJourney: Array<{
    timestamp: string;
    sentiment: Sentiment;
    trigger: string;
  }>;
}

export interface AIProspectConfig {
  scenarioContext: ScenarioContext;
  voiceSettings?: {
    voiceId: string;
    pitch?: number;
    speed?: number;
    emotionalTone?: string;
  };
  behaviorModifiers?: {
    talkativeLevel?: number; // 0-1
    skepticismLevel?: number; // 0-1
    timeConstraint?: boolean;
    moodVolatility?: number; // 0-1
  };
}