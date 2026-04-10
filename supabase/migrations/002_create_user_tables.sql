-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  team_short_name TEXT NOT NULL,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_teams INTEGER[] DEFAULT '{}',
  notifications JSONB DEFAULT '{"dailyDigest": true, "highConfidence": true, "matchAlerts": true}',
  prediction_style TEXT DEFAULT 'balanced',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_predictions table
CREATE TABLE IF NOT EXISTS saved_predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id BIGINT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  predicted_winner TEXT NOT NULL,
  predicted_score TEXT NOT NULL,
  predicted_home_goals INTEGER NOT NULL,
  predicted_away_goals INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  over_under TEXT NOT NULL,
  btts TEXT NOT NULL,
  league TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Create match_polls table for community voting
CREATE TABLE IF NOT EXISTS match_polls (
  id SERIAL PRIMARY KEY,
  match_id BIGINT UNIQUE NOT NULL,
  home_votes INTEGER DEFAULT 0,
  draw_votes INTEGER DEFAULT 0,
  away_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  predicted_scores JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create match_votes table to track individual votes
CREATE TABLE IF NOT EXISTS match_votes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id BIGINT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('home', 'draw', 'away')),
  predicted_score TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_favorites_user_idx ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_user_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS saved_predictions_user_idx ON saved_predictions(user_id);
CREATE INDEX IF NOT EXISTS saved_predictions_match_idx ON saved_predictions(match_id);
CREATE INDEX IF NOT EXISTS match_votes_user_idx ON match_votes(user_id);
CREATE INDEX IF NOT EXISTS match_votes_match_idx ON match_votes(match_id);

-- Function to increment vote counts
CREATE OR REPLACE FUNCTION increment_votes(
  m_id BIGINT,
  home_votes_delta INTEGER DEFAULT 0,
  draw_votes_delta INTEGER DEFAULT 0,
  away_votes_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO match_polls (match_id, home_votes, draw_votes, away_votes)
  VALUES (m_id, GREATEST(0, home_votes_delta), GREATEST(0, draw_votes_delta), GREATEST(0, away_votes_delta))
  ON CONFLICT (match_id)
  DO UPDATE SET
    home_votes = GREATEST(0, match_polls.home_votes + EXCLUDED.home_votes),
    draw_votes = GREATEST(0, match_polls.draw_votes + EXCLUDED.draw_votes),
    away_votes = GREATEST(0, match_polls.away_votes + EXCLUDED.away_votes),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to increment total votes
CREATE OR REPLACE FUNCTION increment_total_votes(m_id BIGINT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO match_polls (match_id, total_votes)
  VALUES (m_id, 1)
  ON CONFLICT (match_id)
  DO UPDATE SET
    total_votes = match_polls.total_votes + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: users can read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User favorites: users can read/write their own favorites
CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own favorites" ON user_favorites FOR UPDATE USING (auth.uid() = user_id);

-- User preferences: users can read/write their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Saved predictions: users can read/write their own predictions
CREATE POLICY "Users can view own predictions" ON saved_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own predictions" ON saved_predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own predictions" ON saved_predictions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON saved_predictions FOR UPDATE USING (auth.uid() = user_id);

-- Match polls: anyone can read, only authenticated can vote
CREATE POLICY "Anyone can view polls" ON match_polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls" ON match_polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own votes" ON match_polls FOR UPDATE USING (true);

-- Match votes: users can read/write their own votes
CREATE POLICY "Users can view own votes" ON match_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own votes" ON match_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own votes" ON match_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own votes" ON match_votes FOR DELETE USING (auth.uid() = user_id);
