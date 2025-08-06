-- Development Database Setup (No Auth Dependencies)
-- Run this in your Supabase SQL Editor for development

-- Drop existing tables if they exist (for clean development setup)
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table without auth dependency for development
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Insert test user for development
INSERT INTO users (id, name, email, role, department, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'samuel.k',
  'samuel.k@example.com',
  'rep',
  'Sales',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  updated_at = NOW();

-- Disable RLS for development (enable it for production)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE scenarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE calls DISABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 'Users table:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Scenarios table:', COUNT(*) FROM scenarios
UNION ALL
SELECT 'Calls table:', COUNT(*) FROM calls; 