-- AI Engine Database Rollback Script
-- Use this to rollback the AI engine migrations if needed

-- Drop new policies
DROP POLICY IF EXISTS "Users can view their own business models" ON business_models;
DROP POLICY IF EXISTS "Users can create their own business models" ON business_models;
DROP POLICY IF EXISTS "Users can update their own business models" ON business_models;
DROP POLICY IF EXISTS "Users can delete their own business models" ON business_models;
DROP POLICY IF EXISTS "All users can view scoring rubrics" ON scoring_rubrics;
DROP POLICY IF EXISTS "Users can view their own performance trends" ON performance_trends;
DROP POLICY IF EXISTS "Users can create their own performance trends" ON performance_trends;
DROP POLICY IF EXISTS "Users can view their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can create their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "All users can view active AI configs" ON ai_engine_config;

-- Drop triggers
DROP TRIGGER IF EXISTS update_business_models_updated_at ON business_models;
DROP TRIGGER IF EXISTS update_scoring_rubrics_updated_at ON scoring_rubrics;
DROP TRIGGER IF EXISTS update_ai_engine_config_updated_at ON ai_engine_config;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_business_models_user_id;
DROP INDEX IF EXISTS idx_business_models_industry;
DROP INDEX IF EXISTS idx_business_models_is_template;
DROP INDEX IF EXISTS idx_scenarios_business_model_id;
DROP INDEX IF EXISTS idx_scenarios_call_type;
DROP INDEX IF EXISTS idx_calls_call_type;
DROP INDEX IF EXISTS idx_calls_created_at;
DROP INDEX IF EXISTS idx_performance_trends_user_id;
DROP INDEX IF EXISTS idx_performance_trends_metric_name;
DROP INDEX IF EXISTS idx_performance_trends_created_at;
DROP INDEX IF EXISTS idx_conversation_sessions_user_id;
DROP INDEX IF EXISTS idx_conversation_sessions_scenario_id;

-- Drop new tables
DROP TABLE IF EXISTS conversation_sessions;
DROP TABLE IF EXISTS performance_trends;
DROP TABLE IF EXISTS scoring_rubrics;
DROP TABLE IF EXISTS ai_engine_config;
DROP TABLE IF EXISTS business_models;

-- Remove columns from existing tables
ALTER TABLE scenarios 
DROP COLUMN IF EXISTS business_model_id,
DROP COLUMN IF EXISTS persona_config,
DROP COLUMN IF EXISTS difficulty_level,
DROP COLUMN IF EXISTS call_type,
DROP COLUMN IF EXISTS voice_settings;

ALTER TABLE calls 
DROP COLUMN IF EXISTS detailed_metrics,
DROP COLUMN IF EXISTS coaching_feedback,
DROP COLUMN IF EXISTS conversation_analysis,
DROP COLUMN IF EXISTS persona_used,
DROP COLUMN IF EXISTS business_context,
DROP COLUMN IF EXISTS call_type;