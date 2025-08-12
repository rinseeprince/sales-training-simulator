// AI Model Configuration

export const AI_MODEL_CONFIG = {
  // OpenAI Models
  prospect: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.8,
    maxTokens: 500,
    presencePenalty: 0.6,
    frequencyPenalty: 0.3
  },
  
  scoring: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    maxTokens: 2000,
    presencePenalty: 0,
    frequencyPenalty: 0
  },
  
  analysis: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.5,
    maxTokens: 1500,
    presencePenalty: 0,
    frequencyPenalty: 0
  },
  
  // Function calling for structured output
  functionCalling: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.2,
    maxTokens: 1000
  }
};

// Voice configuration defaults
export const VOICE_CONFIG = {
  defaultVoiceId: '21m00Tcm4TlvDq8ikWAM',
  voiceSettings: {
    stability: 0.75,
    similarityBoost: 0.75,
    style: 0.5,
    useSpeakerBoost: true
  }
};

// Conversation timing
export const CONVERSATION_TIMING = {
  minResponseDelay: 500, // ms
  maxResponseDelay: 2000, // ms
  typingSimulationDelay: 50, // ms per character
  maxThinkingTime: 3000 // ms
};

// System prompts configuration
export const SYSTEM_PROMPTS = {
  prospectPersona: `You are an AI sales prospect with the following characteristics:
- You have a specific persona, role, and business context
- You respond naturally and realistically based on your persona level
- You reveal information gradually, not all at once
- You have realistic objections and concerns
- You can be convinced with the right approach
- You maintain consistency throughout the conversation`,
  
  callScoring: `You are an expert sales trainer analyzing sales calls. You must:
- Provide objective, metric-based scoring
- Give specific examples from the transcript
- Offer actionable coaching feedback
- Identify both strengths and areas for improvement
- Use sales methodology best practices`,
  
  conversationAnalysis: `You are analyzing the conversation flow and dynamics. Focus on:
- Identifying key moments and turning points
- Tracking sentiment and engagement changes
- Recognizing sales techniques and their effectiveness
- Measuring conversation quality and flow`
};

// Token limits and safety
export const TOKEN_LIMITS = {
  maxConversationHistory: 4000, // tokens
  maxTranscriptLength: 8000, // tokens
  maxResponseLength: 500, // tokens
  conversationMemoryTurns: 10 // number of turns to keep
};

// Error messages
export const ERROR_MESSAGES = {
  aiResponseFailed: 'Failed to generate AI response. Please try again.',
  scoringFailed: 'Failed to score the call. Please try again.',
  transcriptTooShort: 'Transcript is too short for meaningful analysis.',
  invalidPersona: 'Invalid persona configuration.',
  rateLimitExceeded: 'Rate limit exceeded. Please wait before trying again.'
};