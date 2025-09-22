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

export interface ScenarioSettings {
  voiceId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  duration?: number;
  industry?: string;
  customFields?: Record<string, string | number | boolean>;
}

export interface Scenario {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  settings: ScenarioSettings;
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

// Add enhanced scoring interface
export interface EnhancedScoring {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  keyMoments: Array<{
    moment: string;
    feedback: string;
  }>;
  coachingTips: string[];
  scenarioFit: number;
  readyForRealCustomers: boolean;
}

export interface Call {
  id: string;
  rep_id: string;
  scenario_name: string;
  scenario_prompt?: string;
  scenario_prospect_name?: string;
  scenario_voice?: string;
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
  enhanced_scoring?: EnhancedScoring; // Add enhanced scoring data
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
  region?: 'US' | 'UK';
}

export interface RegionalVoice {
  id: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  style: 'professional' | 'executive' | 'casual';
  region: 'US' | 'UK';
  languageCode: string;
  googleVoiceName: string;
  flagEmoji: string;
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
  settings?: ScenarioSettings;
}

export interface AuthRequest {
  email: string;
  password: string;
  action: 'login' | 'register';
  name?: string;
  department?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  aud: string;
  role?: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
}

export interface AuthResponse {
  user: AuthUser | null;
  session?: AuthSession | null;
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
  ELEVENLABS_API_KEY?: string; // Legacy - will be deprecated
  GOOGLE_TTS_PROJECT_ID?: string;
  GOOGLE_TTS_CLIENT_EMAIL?: string;
  GOOGLE_TTS_PRIVATE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEFAULT_VOICE_ID?: string; // Legacy - will be deprecated
}

// Additional API Types
export interface TranscriptEntry {
  speaker?: 'rep' | 'ai' | 'prospect';
  role?: 'rep' | 'ai' | 'prospect';
  message?: string;
  text?: string;
  content?: string;
  timestamp?: string;
}

export interface SaveCallRequestBody {
  callId?: string;
  transcript: TranscriptEntry[];
  repId: string;
  scenarioName: string;
  scenarioPrompt?: string;
  scenario_prompt?: string;
  scenario_prospect_name?: string;
  scenario_voice?: string;
  duration?: number;
  audioUrl?: string;
  conversationHistory?: TranscriptEntry[];
  scoreOnly?: boolean;
  existingEnhancedScoring?: EnhancedScoring | null;
  assignmentId?: string;
}

export interface SaveCallResponse {
  callId?: string;
  score: number;
  feedback: string[];
  talk_ratio: number;
  objections_handled: number;
  cta_used: boolean;
  sentiment: string;
  success: boolean;
  enhancedScoring?: EnhancedScoring;
}

export interface AssignmentData {
  id?: string;
  scenario_id: string;
  assigned_by: string;
  assigned_to_user: string;
  deadline?: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'approved';
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentsRequestBody {
  assignments?: AssignmentData[];
  scenarioId?: string;
  assignedBy?: string;
  assignedToUsers?: string[];
  deadline?: string;
}

export interface UpdateAssignmentRequestBody {
  assignmentId: string;
  status: string;
  callId?: string;
  approvedBy?: string;
}

export interface ScenarioData {
  prompt?: string;
  voice?: string;
  scenario?: string;
  [key: string]: unknown;
}

export interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
} 