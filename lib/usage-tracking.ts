import { supabase } from '@/lib/api-utils';

export interface UsageMetrics {
  simulationsCompleted: number;
  scenariosCreated: number;
  voiceStreamingUsed: boolean;
  analyticsViewed: boolean;
  lastActive: string;
  totalSessions: number;
  averageSessionDuration: number;
  favoriteFeatures: string[];
}

export interface UsageEvent {
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export async function trackUsage(userId: string, action: string, metadata?: Record<string, any>) {
  try {
    const event: UsageEvent = {
      userId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Store usage event in database
    const { error } = await supabase
      .from('user_usage')
      .insert(event);

    if (error) {
      console.error('Failed to track usage:', error);
    } else {
      console.log(`Tracked usage: ${action} for user ${userId}`);
    }

    // Update user's last activity
    await supabase
      .from('simple_users')
      .update({ 
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

  } catch (error) {
    console.error('Usage tracking error:', error);
  }
}

export async function getUsageStats(userId: string): Promise<UsageMetrics> {
  try {
    // Get user's usage events
    const { data: events, error } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get usage stats:', error);
      return getDefaultUsageMetrics();
    }

    // Calculate metrics
    const simulationsCompleted = events?.filter(e => e.action === 'simulation_completed').length || 0;
    const scenariosCreated = events?.filter(e => e.action === 'scenario_created').length || 0;
    const voiceStreamingUsed = events?.some(e => e.action === 'voice_streaming_used') || false;
    const analyticsViewed = events?.some(e => e.action === 'analytics_viewed') || false;
    const totalSessions = events?.filter(e => e.action === 'session_started').length || 0;

    // Calculate average session duration
    const sessionEvents = events?.filter(e => e.action === 'session_ended') || [];
    const totalDuration = sessionEvents.reduce((sum, event) => {
      return sum + (event.metadata?.duration || 0);
    }, 0);
    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Get favorite features (most used)
    const actionCounts = events?.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const favoriteFeatures = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([action]) => action);

    return {
      simulationsCompleted,
      scenariosCreated,
      voiceStreamingUsed,
      analyticsViewed,
      lastActive: events?.[0]?.created_at || new Date().toISOString(),
      totalSessions,
      averageSessionDuration,
      favoriteFeatures,
    };

  } catch (error) {
    console.error('Error getting usage stats:', error);
    return getDefaultUsageMetrics();
  }
}

function getDefaultUsageMetrics(): UsageMetrics {
  return {
    simulationsCompleted: 0,
    scenariosCreated: 0,
    voiceStreamingUsed: false,
    analyticsViewed: false,
    lastActive: new Date().toISOString(),
    totalSessions: 0,
    averageSessionDuration: 0,
    favoriteFeatures: [],
  };
}

// Predefined tracking functions for common actions
export const trackSimulationCompleted = (userId: string, duration: number, score?: number) => {
  return trackUsage(userId, 'simulation_completed', { duration, score });
};

export const trackScenarioCreated = (userId: string, scenarioType: string) => {
  return trackUsage(userId, 'scenario_created', { scenarioType });
};

export const trackVoiceStreamingUsed = (userId: string, duration: number) => {
  return trackUsage(userId, 'voice_streaming_used', { duration });
};

export const trackAnalyticsViewed = (userId: string, page: string) => {
  return trackUsage(userId, 'analytics_viewed', { page });
};

export const trackSessionStarted = (userId: string) => {
  return trackUsage(userId, 'session_started');
};

export const trackSessionEnded = (userId: string, duration: number) => {
  return trackUsage(userId, 'session_ended', { duration });
};

export const trackFeatureUsed = (userId: string, feature: string) => {
  return trackUsage(userId, 'feature_used', { feature });
};

export const trackFeedbackSubmitted = (userId: string, feedbackType: string, rating?: number) => {
  return trackUsage(userId, 'feedback_submitted', { feedbackType, rating });
};
