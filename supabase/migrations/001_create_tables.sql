-- Create fixtures table
CREATE TABLE IF NOT EXISTS fixtures (
  id BIGINT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  league TEXT NOT NULL,
  league_id INTEGER,
  country TEXT,
  home_team JSONB NOT NULL,
  away_team JSONB NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled',
  status_long TEXT DEFAULT 'Scheduled',
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  competition TEXT NOT NULL,
  predicted_winner TEXT NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  home_win_prob INTEGER NOT NULL,
  draw_prob INTEGER NOT NULL,
  away_win_prob INTEGER NOT NULL,
  over_under TEXT NOT NULL,
  btts TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'cron',
  UNIQUE(match_id)
);

-- Create cron logs table
CREATE TABLE IF NOT EXISTS cron_logs (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  fixtures_count INTEGER,
  predictions_count INTEGER,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS fixtures_date_idx ON fixtures(date);
CREATE INDEX IF NOT EXISTS predictions_date_idx ON predictions(date);
CREATE INDEX IF NOT EXISTS predictions_match_id_idx ON predictions(match_id);

-- Enable Row Level Security (optional, can be disabled for development)
-- ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for development)
-- If using RLS, uncomment these policies:
-- CREATE POLICY "Allow public read" ON fixtures FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow public read" ON predictions FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow public insert" ON predictions FOR INSERT TO anon WITH CHECK (true);
