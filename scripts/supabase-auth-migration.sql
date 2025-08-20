-- Supabase Auth Migration Script
-- Run this in your Supabase SQL Editor

-- Update simple_users table to work with Supabase Auth
ALTER TABLE simple_users 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_simple_users_auth_user_id ON simple_users(auth_user_id);

-- Update RLS policies for simple_users to work with Supabase Auth
DROP POLICY IF EXISTS "Users can view their own profile" ON simple_users;
CREATE POLICY "Users can view their own profile" ON simple_users
FOR SELECT USING (auth.uid() = auth_user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON simple_users;
CREATE POLICY "Users can update their own profile" ON simple_users
FOR UPDATE USING (auth.uid() = auth_user_id OR auth.uid() = id);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON simple_users;
CREATE POLICY "Users can insert their own profile" ON simple_users
FOR INSERT WITH CHECK (auth.uid() = auth_user_id OR auth.uid() = id);

-- Update scenarios policies to work with Supabase Auth
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
CREATE POLICY "Users can view their own scenarios" ON scenarios
FOR SELECT USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own scenarios" ON scenarios;
CREATE POLICY "Users can create their own scenarios" ON scenarios
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
CREATE POLICY "Users can update their own scenarios" ON scenarios
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;
CREATE POLICY "Users can delete their own scenarios" ON scenarios
FOR DELETE USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

-- Update calls policies to work with Supabase Auth
DROP POLICY IF EXISTS "Users can view their own calls" ON calls;
CREATE POLICY "Users can view their own calls" ON calls
FOR SELECT USING (
  rep_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own calls" ON calls;
CREATE POLICY "Users can create their own calls" ON calls
FOR INSERT WITH CHECK (
  rep_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own calls" ON calls;
CREATE POLICY "Users can update their own calls" ON calls
FOR UPDATE USING (
  rep_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own calls" ON calls;
CREATE POLICY "Users can delete their own calls" ON calls
FOR DELETE USING (
  rep_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

-- Update user_usage policies to work with Supabase Auth
DROP POLICY IF EXISTS "Users can view their own usage" ON user_usage;
CREATE POLICY "Users can view their own usage" ON user_usage
FOR SELECT USING (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own usage" ON user_usage;
CREATE POLICY "Users can insert their own usage" ON user_usage
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM simple_users 
    WHERE auth_user_id = auth.uid() OR id = auth.uid()
  )
);

-- Create a function to sync auth users with simple_users
CREATE OR REPLACE FUNCTION sync_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO simple_users (
      id,
      auth_user_id,
      email,
      name,
      email_verified,
      subscription_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      NEW.email_confirmed_at IS NOT NULL,
      'free',
      NEW.created_at,
      NEW.updated_at
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE simple_users SET
      email = NEW.email,
      name = NEW.raw_user_meta_data->>'name',
      email_verified = NEW.email_confirmed_at IS NOT NULL,
      updated_at = NEW.updated_at
    WHERE auth_user_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM simple_users WHERE auth_user_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync auth.users with simple_users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_user();

