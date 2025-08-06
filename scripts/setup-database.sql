-- Database setup script for Sales Training Simulator
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'admin')),
  department TEXT DEFAULT 'Sales',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  persona TEXT,
  difficulty TEXT DEFAULT 'medium',
  industry TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
FOR UPDATE USING (auth.uid() = id);

-- Scenarios policies
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios" ON scenarios
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios" ON scenarios
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios" ON scenarios
FOR DELETE USING (auth.uid() = user_id);

-- Calls policies
CREATE POLICY "Users can view their own calls" ON calls
FOR SELECT USING (auth.uid() = rep_id);

CREATE POLICY "Users can create their own calls" ON calls
FOR INSERT WITH CHECK (auth.uid() = rep_id);

CREATE POLICY "Users can update their own calls" ON calls
FOR UPDATE USING (auth.uid() = rep_id);

CREATE POLICY "Users can delete their own calls" ON calls
FOR DELETE USING (auth.uid() = rep_id);

-- Insert a test user if needed (replace with your actual user ID)
-- INSERT INTO users (id, name, email, role) 
-- VALUES ('your-user-id-here', 'Test User', 'test@example.com', 'rep')
-- ON CONFLICT (id) DO NOTHING; 