-- Template Scenarios Database Schema (Fixed)
-- This script creates the infrastructure for pre-built scenario templates
-- Run this in your Supabase SQL Editor

-- Create template_scenarios table
CREATE TABLE IF NOT EXISTS template_scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'cold_calling',
        'product_demo', 
        'objection_handling',
        'discovery',
        'closing',
        'follow_up',
        'negotiation',
        'upselling'
    )),
    industry TEXT CHECK (industry IN (
        'saas',
        'real_estate',
        'insurance',
        'healthcare',
        'finance',
        'manufacturing',
        'retail',
        'consulting',
        'general'
    )),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    prospect_name TEXT,
    voice TEXT,
    tags TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    learning_objectives TEXT[] DEFAULT '{}',
    success_criteria TEXT[] DEFAULT '{}',
    common_objections TEXT[] DEFAULT '{}',
    coaching_tips TEXT[] DEFAULT '{}',
    estimated_duration INTEGER DEFAULT 300,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    average_score DECIMAL DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add template tracking to existing scenarios table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scenarios') THEN
        ALTER TABLE scenarios 
        ADD COLUMN IF NOT EXISTS template_id UUID,
        ADD COLUMN IF NOT EXISTS is_template_clone BOOLEAN DEFAULT false;
        
        -- Add foreign key constraint if template_scenarios exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'template_scenarios') THEN
            ALTER TABLE scenarios 
            DROP CONSTRAINT IF EXISTS scenarios_template_id_fkey;
            
            ALTER TABLE scenarios 
            ADD CONSTRAINT scenarios_template_id_fkey 
            FOREIGN KEY (template_id) REFERENCES template_scenarios(id);
        END IF;
    END IF;
END $$;

-- Create template usage tracking table
CREATE TABLE IF NOT EXISTS template_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES template_scenarios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    scenario_id UUID,
    call_id UUID,
    action_type TEXT NOT NULL CHECK (action_type IN ('viewed', 'cloned', 'started', 'completed')),
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE template_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_scenarios
-- Everyone can view active templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON template_scenarios;
CREATE POLICY "Anyone can view active templates" ON template_scenarios
FOR SELECT USING (is_active = true);

-- Only users with admin role can create/update templates
DROP POLICY IF EXISTS "Admins can manage templates" ON template_scenarios;
CREATE POLICY "Admins can manage templates" ON template_scenarios
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM simple_users 
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    OR 
    created_by = auth.uid()
);

-- RLS Policies for template_usage
-- Users can view their own usage
DROP POLICY IF EXISTS "Users can view their own template usage" ON template_usage;
CREATE POLICY "Users can view their own template usage" ON template_usage
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own usage records
DROP POLICY IF EXISTS "Users can insert their own template usage" ON template_usage;
CREATE POLICY "Users can insert their own template usage" ON template_usage
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_scenarios_category ON template_scenarios(category);
CREATE INDEX IF NOT EXISTS idx_template_scenarios_industry ON template_scenarios(industry);
CREATE INDEX IF NOT EXISTS idx_template_scenarios_difficulty ON template_scenarios(difficulty);
CREATE INDEX IF NOT EXISTS idx_template_scenarios_active ON template_scenarios(is_active);
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON template_usage(user_id);

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage count and average score
    UPDATE template_scenarios 
    SET 
        usage_count = (
            SELECT COUNT(*) FROM template_usage 
            WHERE template_id = NEW.template_id AND action_type = 'completed'
        ),
        average_score = (
            SELECT AVG(score) FROM template_usage 
            WHERE template_id = NEW.template_id AND action_type = 'completed' AND score IS NOT NULL
        ),
        updated_at = NOW()
    WHERE id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when template usage is recorded
DROP TRIGGER IF EXISTS trigger_update_template_stats ON template_usage;
CREATE TRIGGER trigger_update_template_stats
    AFTER INSERT ON template_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_template_stats();

-- Function to track template usage (simplified version)
CREATE OR REPLACE FUNCTION track_template_usage(
    p_template_id UUID,
    p_user_id UUID,
    p_action_type TEXT,
    p_scenario_id UUID DEFAULT NULL,
    p_call_id UUID DEFAULT NULL,
    p_score INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO template_usage (
        template_id, 
        user_id, 
        action_type, 
        scenario_id, 
        call_id, 
        score
    ) VALUES (
        p_template_id, 
        p_user_id, 
        p_action_type, 
        p_scenario_id, 
        p_call_id, 
        p_score
    );
END;
$$ LANGUAGE plpgsql;