// Conversation Management Types

export interface ConversationMetadata {
  phase?: string;
  sentiment?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  confidence?: number;
}

export interface ConversationTurn {
  id: string;
  speaker: 'rep' | 'prospect';
  message: string;
  timestamp: string;
  metadata?: ConversationMetadata;
}

export interface ConversationContext {
  scenarioId: string;
  sessionId: string;
  startTime: string;
  currentPhase: string;
  turns: ConversationTurn[];
  state: ConversationState;
  memory: ProspectMemory;
  metrics: {
    duration: number;
    turnCount: number;
    avgResponseTime: number;
  };
}

export interface ConversationEventDetails {
  description?: string;
  value?: string | number;
  metadata?: Record<string, unknown>;
}

export interface ConversationEvent {
  type: 'phase-change' | 'objection' | 'commitment' | 'question' | 'value-prop' | 'closing-attempt';
  timestamp: string;
  details: ConversationEventDetails;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface ConversationAnalytics {
  events: ConversationEvent[];
  phaseTransitions: Array<{
    from: string;
    to: string;
    timestamp: string;
    trigger: string;
  }>;
  keyMoments: Array<{
    type: string;
    timestamp: string;
    description: string;
    effectiveness: number;
  }>;
  pacing: {
    avgTurnDuration: number;
    longestPause: number;
    conversationFlow: 'smooth' | 'choppy' | 'rushed';
  };
}

// Re-export types from other files for convenience
export type { ConversationState, ProspectMemory } from './prospect-types';