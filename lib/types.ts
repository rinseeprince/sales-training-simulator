// API Types for Sales Roleplay Simulator

// RBAC Types
export type UserRole = 'user' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  team_id?: string;
  manager_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
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
  is_company_generated?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Scenario Assignment Types
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type AssignmentResult = 'pass' | 'fail' | null;

export interface ScenarioAssignment {
  id: string;
  scenario_id: string;
  assigned_by: string;
  assigned_to_user?: string;
  assigned_to_team?: string;
  deadline?: string;
  status: AssignmentStatus;
  completed_at?: string;
  result?: AssignmentResult;
  score?: number;
  created_at: string;
  updated_at: string;
  // Relations
  scenario?: Scenario;
  assigned_by_user?: User;
  assigned_to_user_data?: User;
  assigned_to_team_data?: Team;
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
  scenario_assignment_id?: string;
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
  is_company_generated?: boolean;
  status?: 'draft' | 'completed' | 'reviewed';
  approved?: boolean;
  certified?: boolean;
  request_retry?: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  rep?: User;
  reviewer?: User;
  assignment?: ScenarioAssignment;
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
  ELEVENLABS_API_KEY?: string; // Legacy - will be deprecated
  GOOGLE_TTS_PROJECT_ID?: string;
  GOOGLE_TTS_CLIENT_EMAIL?: string;
  GOOGLE_TTS_PRIVATE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DEFAULT_VOICE_ID?: string; // Legacy - will be deprecated
} 

// Simulation Feedback Types
export type FeedbackType = 'comment' | 'coaching' | 'approval' | 'rejection';

export interface SimulationFeedback {
  id: string;
  simulation_id: string;
  author_id: string;
  body: string;
  feedback_type: FeedbackType;
  created_at: string;
  updated_at: string;
  // Relations
  author?: User;
}

// Notification Types
export type NotificationType = 
  | 'scenario_assigned'
  | 'assignment_completed'
  | 'assignment_overdue'
  | 'simulation_reviewed'
  | 'simulation_approved'
  | 'simulation_rejected'
  | 'simulation_certified'
  | 'retry_requested'
  | 'feedback_received';

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  entity_type?: 'scenario_assignment' | 'simulation' | 'feedback';
  entity_id?: string;
  title: string;
  message: string;
  payload?: Record<string, any>;
  triggered_at: string;
  read_at?: string;
  clicked_at?: string;
  created_at: string;
  // Relations
  recipient?: User;
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
} 