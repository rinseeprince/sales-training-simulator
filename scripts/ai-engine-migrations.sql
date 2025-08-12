-- AI Engine Database Migrations
-- Run this in your Supabase SQL Editor after the initial setup

-- Business Models Table
CREATE TABLE IF NOT EXISTS business_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('small', 'medium', 'large', 'enterprise')),
  annual_revenue TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  value_propositions JSONB DEFAULT '[]',
  target_markets JSONB DEFAULT '[]',
  competitive_advantages JSONB DEFAULT '[]',
  common_objections JSONB DEFAULT '[]',
  sales_process JSONB DEFAULT '{}',
  key_metrics JSONB DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Scenarios Table
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS business_model_id UUID REFERENCES business_models(id) ON DELETE SET NULL;

ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS persona_config JSONB DEFAULT '{
  "level": "manager",
  "personalityTraits": ["professional", "analytical"]
}';

ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 3 
CHECK (difficulty_level >= 1 AND difficulty_level <= 5);

ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'discovery-outbound'
CHECK (call_type IN ('discovery-outbound', 'discovery-inbound', 'objection-handling', 'elevator-pitch'));

ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "stability": 0.75,
  "similarityBoost": 0.75
}';

-- Enhanced Calls Table for Detailed Scoring
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS detailed_metrics JSONB DEFAULT '{}';

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS coaching_feedback JSONB DEFAULT '{}';

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS conversation_analysis JSONB DEFAULT '{}';

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS persona_used JSONB DEFAULT '{}';

ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS business_context JSONB DEFAULT '{}';

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS call_type TEXT DEFAULT 'discovery-outbound';

-- Scoring Rubrics Table
CREATE TABLE IF NOT EXISTS scoring_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL UNIQUE,
  criteria JSONB NOT NULL DEFAULT '[]',
  examples JSONB DEFAULT '[]',
  weight DECIMAL(3,2) DEFAULT 0.20,
  benchmarks JSONB DEFAULT '{
    "beginner": 50,
    "intermediate": 70,
    "advanced": 85,
    "expert": 95
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Tracking Table
CREATE TABLE IF NOT EXISTS performance_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  call_type TEXT,
  trend_period TEXT DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Sessions Table
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
  session_state JSONB NOT NULL DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  analytics JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- AI Engine Configuration Table
CREATE TABLE IF NOT EXISTS ai_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT NOT NULL UNIQUE,
  config_type TEXT NOT NULL CHECK (config_type IN ('persona', 'prompt', 'scoring', 'voice')),
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_models_user_id ON business_models(user_id);
CREATE INDEX IF NOT EXISTS idx_business_models_industry ON business_models(industry);
CREATE INDEX IF NOT EXISTS idx_business_models_is_template ON business_models(is_template);

CREATE INDEX IF NOT EXISTS idx_scenarios_business_model_id ON scenarios(business_model_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_call_type ON scenarios(call_type);

CREATE INDEX IF NOT EXISTS idx_calls_call_type ON calls(call_type);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_trends_user_id ON performance_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_trends_metric_name ON performance_trends(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_trends_created_at ON performance_trends(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_scenario_id ON conversation_sessions(scenario_id);

-- Enable RLS for new tables
ALTER TABLE business_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_engine_config ENABLE ROW LEVEL SECURITY;

-- Business Models policies
CREATE POLICY "Users can view their own business models" ON business_models
FOR SELECT USING (auth.uid() = user_id OR is_template = true);

CREATE POLICY "Users can create their own business models" ON business_models
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business models" ON business_models
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business models" ON business_models
FOR DELETE USING (auth.uid() = user_id);

-- Scoring Rubrics policies (read-only for all authenticated users)
CREATE POLICY "All users can view scoring rubrics" ON scoring_rubrics
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Performance Trends policies
CREATE POLICY "Users can view their own performance trends" ON performance_trends
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance trends" ON performance_trends
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversation Sessions policies
CREATE POLICY "Users can view their own conversation sessions" ON conversation_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation sessions" ON conversation_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sessions" ON conversation_sessions
FOR UPDATE USING (auth.uid() = user_id);

-- AI Engine Config policies (read-only for all, write for admins)
CREATE POLICY "All users can view active AI configs" ON ai_engine_config
FOR SELECT USING (is_active = true);

-- Insert default scoring rubrics
INSERT INTO scoring_rubrics (metric_name, criteria, weight) VALUES
('talk_ratio', 
 '[
   {"score": 100, "description": "Perfect balance within ideal range"},
   {"score": 90, "description": "Slightly outside ideal range (±5%)"},
   {"score": 75, "description": "Moderately outside ideal range (±10%)"},
   {"score": 50, "description": "Significantly outside ideal range (±20%)"},
   {"score": 25, "description": "Far outside ideal range (±30%)"},
   {"score": 0, "description": "Extremely imbalanced (>30% off)"}
 ]'::jsonb, 
 0.20),
 
('discovery', 
 '[
   {"score": 100, "description": "Deep discovery with business impact questions"},
   {"score": 85, "description": "Good mix of open questions covering key areas"},
   {"score": 70, "description": "Basic discovery with some open questions"},
   {"score": 50, "description": "Surface-level questions, mostly closed"},
   {"score": 30, "description": "Very few questions asked"},
   {"score": 0, "description": "No discovery attempted"}
 ]'::jsonb, 
 0.25),
 
('objection_handling', 
 '[
   {"score": 100, "description": "All objections handled with proper technique"},
   {"score": 85, "description": "Most objections handled well"},
   {"score": 70, "description": "Objections addressed but missing steps"},
   {"score": 50, "description": "Attempted but ineffective"},
   {"score": 25, "description": "Defensive or argumentative"},
   {"score": 0, "description": "Objections ignored"}
 ]'::jsonb, 
 0.20),
 
('confidence', 
 '[
   {"score": 100, "description": "Strong presence, clear communication"},
   {"score": 85, "description": "Generally confident with minor hesitations"},
   {"score": 70, "description": "Adequate confidence, some filler words"},
   {"score": 50, "description": "Noticeable uncertainty"},
   {"score": 25, "description": "Very uncertain, excessive hesitation"},
   {"score": 0, "description": "No confidence"}
 ]'::jsonb, 
 0.15),
 
('cta', 
 '[
   {"score": 100, "description": "Clear, specific CTA with mutual agreement"},
   {"score": 85, "description": "Good CTA with most elements"},
   {"score": 70, "description": "CTA attempted with some specificity"},
   {"score": 50, "description": "Vague next steps mentioned"},
   {"score": 25, "description": "Weak closing attempt"},
   {"score": 0, "description": "No CTA or next steps"}
 ]'::jsonb, 
 0.20)
ON CONFLICT (metric_name) DO NOTHING;

-- Insert sample business model templates
INSERT INTO business_models (
  user_id,
  company_name,
  industry,
  company_size,
  products,
  value_propositions,
  common_objections,
  is_template
) VALUES 
(
  NULL,
  'Generic SaaS Company',
  'Technology',
  'medium',
  '[
    {"name": "CRM Platform", "category": "Sales Software", "price": "$99/user/month"},
    {"name": "Marketing Automation", "category": "Marketing Software", "price": "$199/user/month"}
  ]'::jsonb,
  '[
    "Increase sales productivity by 30%",
    "Reduce customer acquisition cost by 25%",
    "Improve customer retention by 40%"
  ]'::jsonb,
  '[
    "We already have Salesforce",
    "Too expensive for our budget",
    "Implementation seems complex",
    "Need to get buy-in from the team"
  ]'::jsonb,
  true
),
(
  NULL,
  'Healthcare Provider',
  'Healthcare',
  'large',
  '[
    {"name": "Patient Management System", "category": "Healthcare IT", "price": "Custom pricing"},
    {"name": "Telehealth Platform", "category": "Digital Health", "price": "$500/provider/month"}
  ]'::jsonb,
  '[
    "Reduce patient wait times by 50%",
    "Improve clinical outcomes with data insights",
    "Ensure HIPAA compliance"
  ]'::jsonb,
  '[
    "Concerned about data security",
    "Integration with existing EMR systems",
    "Staff training requirements",
    "Regulatory compliance"
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_business_models_updated_at BEFORE UPDATE ON business_models
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_rubrics_updated_at BEFORE UPDATE ON scoring_rubrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_engine_config_updated_at BEFORE UPDATE ON ai_engine_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();