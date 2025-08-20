-- Usage Tracking and Future-Ready Database Schema
-- Run this in your Supabase SQL Editor

-- Add fields for future monetization (but don't enforce them yet)
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'paid', 'trial')),
ADD COLUMN IF NOT EXISTS usage_metrics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS beta_feedback TEXT,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a simple usage tracking table
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for usage queries
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_action ON user_usage(action);
CREATE INDEX IF NOT EXISTS idx_user_usage_created_at ON user_usage(created_at);

-- Enable RLS on user_usage table
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_usage
CREATE POLICY "Users can view their own usage" ON user_usage
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own usage" ON user_usage
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create a view for usage analytics (for future admin dashboard)
CREATE OR REPLACE VIEW usage_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.created_at as user_created_at,
  u.last_active,
  COUNT(usage.id) as total_actions,
  COUNT(CASE WHEN usage.action = 'simulation_completed' THEN 1 END) as simulations_completed,
  COUNT(CASE WHEN usage.action = 'scenario_created' THEN 1 END) as scenarios_created,
  COUNT(CASE WHEN usage.action = 'voice_streaming_used' THEN 1 END) as voice_sessions,
  COUNT(CASE WHEN usage.action = 'analytics_viewed' THEN 1 END) as analytics_views,
  MAX(usage.created_at) as last_action
FROM simple_users u
LEFT JOIN user_usage usage ON u.id = usage.user_id
GROUP BY u.id, u.email, u.name, u.created_at, u.last_active;

-- Create a function to get user usage stats
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'simulationsCompleted', COUNT(CASE WHEN action = 'simulation_completed' THEN 1 END),
    'scenariosCreated', COUNT(CASE WHEN action = 'scenario_created' THEN 1 END),
    'voiceStreamingUsed', COUNT(CASE WHEN action = 'voice_streaming_used' THEN 1 END) > 0,
    'analyticsViewed', COUNT(CASE WHEN action = 'analytics_viewed' THEN 1 END) > 0,
    'totalSessions', COUNT(CASE WHEN action = 'session_started' THEN 1 END),
    'lastActive', MAX(created_at),
    'favoriteFeatures', (
      SELECT json_agg(action)
      FROM (
        SELECT action, COUNT(*) as count
        FROM user_usage
        WHERE user_id = user_uuid
        GROUP BY action
        ORDER BY count DESC
        LIMIT 3
      ) t
    )
  ) INTO result
  FROM user_usage
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_usage_stats(UUID) TO authenticated;
