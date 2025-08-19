-- Simple Authentication Schema for Fast Deployment
-- Run this in your Supabase SQL Editor

-- Simple users table
CREATE TABLE IF NOT EXISTS simple_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires TIMESTAMP WITH TIME ZONE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'paid', 'trial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple sessions table
CREATE TABLE IF NOT EXISTS simple_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES simple_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update existing scenarios table to use simple_users
ALTER TABLE scenarios 
DROP CONSTRAINT IF EXISTS scenarios_user_id_fkey,
ADD CONSTRAINT scenarios_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES simple_users(id) ON DELETE CASCADE;

-- Update existing calls table to use simple_users  
ALTER TABLE calls
DROP CONSTRAINT IF EXISTS calls_rep_id_fkey,
ADD CONSTRAINT calls_rep_id_fkey
FOREIGN KEY (rep_id) REFERENCES simple_users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_simple_users_email ON simple_users(email);
CREATE INDEX IF NOT EXISTS idx_simple_users_verification_token ON simple_users(verification_token);
CREATE INDEX IF NOT EXISTS idx_simple_users_reset_token ON simple_users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_simple_sessions_user_id ON simple_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_simple_sessions_token ON simple_sessions(session_token);

-- Enable Row Level Security
ALTER TABLE simple_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simple_users
CREATE POLICY "Users can view their own profile" ON simple_users
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON simple_users  
FOR UPDATE USING (id = auth.uid());

-- RLS Policies for simple_sessions
CREATE POLICY "Users can view their own sessions" ON simple_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions" ON simple_sessions
FOR ALL USING (user_id = auth.uid());

-- Update scenarios policies to use simple_users
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own scenarios" ON scenarios;
CREATE POLICY "Users can create their own scenarios" ON scenarios
FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
CREATE POLICY "Users can update their own scenarios" ON scenarios
FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;
CREATE POLICY "Users can delete their own scenarios" ON scenarios
FOR DELETE USING (user_id = auth.uid());

-- Update calls policies to use simple_users
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
CREATE POLICY "Users can view their own calls" ON calls
FOR SELECT USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own calls" ON calls;
CREATE POLICY "Users can create their own calls" ON calls
FOR INSERT WITH CHECK (rep_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own calls" ON calls;
CREATE POLICY "Users can update their own calls" ON calls
FOR UPDATE USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own calls" ON calls;
CREATE POLICY "Users can delete their own calls" ON calls
FOR DELETE USING (rep_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_simple_users_updated_at 
BEFORE UPDATE ON simple_users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Helper function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM simple_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access resource
CREATE OR REPLACE FUNCTION user_can_access_resource(user_uuid UUID, resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_uuid = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
