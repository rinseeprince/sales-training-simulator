// API Types for Sales Roleplay Simulator

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'rep' | 'manager' | 'admin';
  department: string;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  settings: Record<string, any>;
  persona: string;
  difficulty: 'easy' | 'medium' | 'hard';
  industry: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CallTranscript {
  speaker: 'rep' | 'ai';
  message: string;
  text?: string; // Alternative field name for message content
  timestamp?: string;
}

export interface Call {
  id: string;
  rep_id: string;
  scenario_name: string;
  transcript: CallTranscript[];
  score: number;
  talk_ratio: number;
  objections_handled: number;
  cta_used: boolean;
  sentiment: 'friendly' | 'aggressive' | 'neutral';
  feedback: string[];
  duration: number;
  audio_url?: string;
  audio_duration?: number;
  audio_file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface CallScore {
  score: number;
  talkRatio: number;
  objectionsHandled: number;
  ctaUsed: boolean;
  sentiment: 'friendly' | 'aggressive' | 'neutral';
  feedback: string[];
  metrics: {
    totalMessages: number;
    repMessages: number;
    aiMessages: number;
    duration: number;
  };
}

export interface LeaderboardEntry {
  repId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  totalCalls: number;
  averageScore: number;
  totalScore: number;
  ctaSuccessRate: number;
  avgObjectionsHandled: number;
  avgDuration: number;
  uniqueScenarios: number;
  recentCalls: Array<{
    score: number;
    scenario: string;
    date: string;
    duration: number;
    objectionsHandled: number;
    ctaUsed: boolean;
    sentiment: string;
  }>;
  certifications: string[];
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  overallStats: {
    totalReps: number;
    totalCalls: number;
    averageScore: number;
    topPerformer: LeaderboardEntry | null;
    timeRange: string;
    lastUpdated: string;
  };
  filters: {
    timeRange: string;
    limit: number;
    role: string;
  };
}

export interface VoiceSettings {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface StartSimulationRequest {
  scenarioPrompt: string;
  persona?: string;
  voiceSettings?: VoiceSettings;
  enableStreaming?: boolean;
}

export interface StartSimulationResponse {
  aiResponse: string;
  audioUrl?: string;
  timestamp: string;
}

export interface StreamingConfig {
  scenarioPrompt: string;
  persona?: string;
  voiceSettings?: VoiceSettings;
  enableStreaming?: boolean;
}

export interface VoiceChunk {
  type: 'text_chunk' | 'audio_chunk' | 'completion' | 'error' | 'voice_error';
  content?: string;
  audioUrl?: string;
  chunkId?: number;
  isComplete?: boolean;
  text?: string;
  error?: string;
  fullResponse?: string;
  totalChunks?: number;
  timestamp?: string;
}

export interface ConversationMessage {
  role: 'rep' | 'ai';
  content: string;
  timestamp: string;
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  timestamp: string;
  confidence?: number;
}

export interface ScoreCallRequest {
  transcript: CallTranscript[];
}

export interface SaveTranscriptRequest {
  transcript: CallTranscript[];
  repId: string;
  scenarioName: string;
  score?: number;
  talkRatio?: number;
  objectionsHandled?: number;
  ctaUsed?: boolean;
  sentiment?: string;
  feedback?: string[];
  duration?: number;
  timestamp?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFileSize?: number;
}

export interface UploadCallRequest {
  audioFile: File;
  metadata: {
    userId: string;
    scenarioId: string;
    callId: string;
    timestamp: string;
  };
}

export interface UploadCallResponse {
  audioUrl: string;
  callId: string;
  success: boolean;
  message: string;
}

export interface SaveScenarioRequest {
  title: string;
  prompt: string;
  userId: string;
  persona?: string;
  difficulty?: string;
  industry?: string;
  tags?: string[];
  settings?: Record<string, any>;
}

export interface AuthRequest {
  email: string;
  password: string;
  action: 'login' | 'register';
  name?: string;
  department?: string;
}

export interface AuthResponse {
  user: any;
  session?: any;
  profile?: User | null;
  message: string;
}

// API Error Response
export interface APIError {
  error: string;
}

// Environment Variables
export interface EnvironmentVariables {
  OPENAI_API_KEY: string;
  ELEVENLABS_API_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEFAULT_VOICE_ID?: string;
} 