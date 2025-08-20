import { useCallback } from 'react';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import {
  trackUsage,
  trackSimulationCompleted,
  trackScenarioCreated,
  trackVoiceStreamingUsed,
  trackAnalyticsViewed,
  trackSessionStarted,
  trackSessionEnded,
  trackFeatureUsed,
  trackFeedbackSubmitted,
} from '@/lib/usage-tracking';

export function useUsageTracking() {
  const { user } = useSupabaseAuth();

  const track = useCallback((action: string, metadata?: Record<string, any>) => {
    if (user?.id) {
      trackUsage(user.id, action, metadata);
    }
  }, [user?.id]);

  const trackSimulation = useCallback((duration: number, score?: number) => {
    if (user?.id) {
      trackSimulationCompleted(user.id, duration, score);
    }
  }, [user?.id]);

  const trackScenario = useCallback((scenarioType: string) => {
    if (user?.id) {
      trackScenarioCreated(user.id, scenarioType);
    }
  }, [user?.id]);

  const trackVoice = useCallback((duration: number) => {
    if (user?.id) {
      trackVoiceStreamingUsed(user.id, duration);
    }
  }, [user?.id]);

  const trackAnalytics = useCallback((page: string) => {
    if (user?.id) {
      trackAnalyticsViewed(user.id, page);
    }
  }, [user?.id]);

  const trackSession = useCallback((duration: number) => {
    if (user?.id) {
      trackSessionEnded(user.id, duration);
    }
  }, [user?.id]);

  const trackFeature = useCallback((feature: string) => {
    if (user?.id) {
      trackFeatureUsed(user.id, feature);
    }
  }, [user?.id]);

  const trackFeedback = useCallback((feedbackType: string, rating?: number) => {
    if (user?.id) {
      trackFeedbackSubmitted(user.id, feedbackType, rating);
    }
  }, [user?.id]);

  const startSession = useCallback(() => {
    if (user?.id) {
      trackSessionStarted(user.id);
    }
  }, [user?.id]);

  return {
    track,
    trackSimulation,
    trackScenario,
    trackVoice,
    trackAnalytics,
    trackSession,
    trackFeature,
    trackFeedback,
    startSession,
  };
}
