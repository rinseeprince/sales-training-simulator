-- Fix Fresh Database Schema Issues
-- This script updates the scenarios and calls tables to work with simple_users

-- First, check if the scenarios table exists
DO $$ 
BEGIN
    -- Create scenarios table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scenarios') THEN
        CREATE TABLE scenarios (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            prompt TEXT NOT NULL,
            settings JSONB DEFAULT '{}',
            persona TEXT,
            industry TEXT,
            tags TEXT[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- If it exists, update the foreign key to reference simple_users
        ALTER TABLE scenarios 
        DROP CONSTRAINT IF EXISTS scenarios_user_id_fkey;
        
        ALTER TABLE scenarios 
        ADD CONSTRAINT scenarios_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES simple_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create calls table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calls') THEN
        CREATE TABLE calls (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            rep_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
            scenario_id UUID REFERENCES scenarios(id) ON DELETE SET NULL,
            scenario_name TEXT NOT NULL,
            transcript JSONB DEFAULT '[]',
            score INTEGER,
            talk_ratio DECIMAL,
            objections_handled INTEGER,
            cta_used BOOLEAN,
            sentiment TEXT,
            feedback TEXT[],
            duration INTEGER,
            audio_url TEXT,
            audio_duration INTEGER,
            audio_file_size INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- If it exists, update the foreign key to reference simple_users
        ALTER TABLE calls 
        DROP CONSTRAINT IF EXISTS calls_rep_id_fkey;
        
        ALTER TABLE calls 
        ADD CONSTRAINT calls_rep_id_fkey 
        FOREIGN KEY (rep_id) REFERENCES simple_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can create their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;

DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
DROP POLICY IF EXISTS "Users can create their own calls" ON calls;
DROP POLICY IF EXISTS "Users can update their own calls" ON calls;
DROP POLICY IF EXISTS "Users can delete their own calls" ON calls;

-- Create new RLS policies that work with simple_users
-- Scenarios policies
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (
    user_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can create their own scenarios" ON scenarios
FOR INSERT WITH CHECK (
    user_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can update their own scenarios" ON scenarios
FOR UPDATE USING (
    user_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own scenarios" ON scenarios
FOR DELETE USING (
    user_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

-- Calls policies
CREATE POLICY "Users can view their own calls" ON calls
FOR SELECT USING (
    rep_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can create their own calls" ON calls
FOR INSERT WITH CHECK (
    rep_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can update their own calls" ON calls
FOR UPDATE USING (
    rep_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own calls" ON calls
FOR DELETE USING (
    rep_id IN (
        SELECT id FROM simple_users 
        WHERE auth_user_id = auth.uid() OR id = auth.uid()
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_rep_id ON calls(rep_id);
CREATE INDEX IF NOT EXISTS idx_calls_scenario_id ON calls(scenario_id);

-- Add update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_scenarios_updated_at ON scenarios;
CREATE TRIGGER update_scenarios_updated_at 
BEFORE UPDATE ON scenarios
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_calls_updated_at ON calls;
CREATE TRIGGER update_calls_updated_at 
BEFORE UPDATE ON calls
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Verify the schema
SELECT 'Scenarios table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scenarios' 
ORDER BY ordinal_position;

SELECT 'Calls table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;
