-- ============================================
-- Activity Map MVP - Supabase Schema
-- ============================================

-- Enable PostGIS for geo queries (optional, using lat/lng for MVP)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- Users (profiles linked to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- Activities
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours'),
  is_active BOOLEAN DEFAULT TRUE,
  max_participants INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active activities viewable by all" ON activities
  FOR SELECT USING (true);

CREATE POLICY "Users can create activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (auth.uid() = user_id);

-- Auto-expire activities after 2 hours
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active, ends_at);

-- ============================================
-- Join Requests
-- ============================================
CREATE TABLE IF NOT EXISTS join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Join requests viewable by relevant users" ON join_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM activities WHERE id = activity_id)
  );

CREATE POLICY "Users can create join requests" ON join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Activity owners can update join requests" ON join_requests
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM activities WHERE id = activity_id)
  );

-- ============================================
-- Chat Messages
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by accepted participants" ON messages
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM activities WHERE id = activity_id)
    OR
    auth.uid() IN (
      SELECT user_id FROM join_requests
      WHERE activity_id = messages.activity_id AND status = 'accepted'
    )
  );

CREATE POLICY "Accepted participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM activities WHERE id = activity_id)
    OR
    auth.uid() IN (
      SELECT user_id FROM join_requests
      WHERE activity_id = messages.activity_id AND status = 'accepted'
    )
  );

-- ============================================
-- Function: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'ユーザー'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE join_requests;
