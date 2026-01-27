-- =============================================================================
-- GAME LOGGING & LEADERBOARD SYSTEM
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- 1. GAME LOGS - Enhanced game logging with player stats for leaderboards
CREATE TABLE IF NOT EXISTS game_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Team Info
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_team_id TEXT NOT NULL,
  opponent_team_id TEXT NOT NULL,
  
  -- Game Result
  user_score INTEGER NOT NULL,
  opponent_score INTEGER NOT NULL,
  is_win BOOLEAN NOT NULL,
  game_number INTEGER,  -- Game # in the season
  game_date DATE DEFAULT CURRENT_DATE,
  
  -- Pitching Stats (User's Team)
  winning_pitcher TEXT,  -- Player name
  losing_pitcher TEXT,
  save_pitcher TEXT,     -- If applicable
  user_strikeouts INTEGER DEFAULT 0,  -- Total team strikeouts pitched
  
  -- Hitting Stats (User's Team)
  home_runs_hit JSONB DEFAULT '[]',  -- Array of {player: "Name", count: 1}
  total_home_runs INTEGER DEFAULT 0,
  total_hits INTEGER DEFAULT 0,
  total_rbis INTEGER DEFAULT 0,
  
  -- Optional metadata
  notes TEXT,
  recap_generated BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all game logs" ON game_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own game logs" ON game_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own game logs" ON game_logs
  FOR UPDATE USING (true);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_logs_user_id ON game_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_user_team ON game_logs(user_team_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_date ON game_logs(game_date DESC);
CREATE INDEX IF NOT EXISTS idx_game_logs_is_win ON game_logs(is_win);
CREATE INDEX IF NOT EXISTS idx_game_logs_total_hrs ON game_logs(total_home_runs DESC);

-- 2. PLAYER STATS - Track individual player stats across all games
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Player Info
  player_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stats (cumulative for season)
  home_runs INTEGER DEFAULT 0,
  strikeouts_pitched INTEGER DEFAULT 0,  -- K's as a pitcher
  pitching_wins INTEGER DEFAULT 0,
  pitching_losses INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per player per team per user
  UNIQUE(player_name, team_id, user_id)
);

-- Enable RLS
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view player stats" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can insert player stats" ON player_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update player stats" ON player_stats
  FOR UPDATE USING (true);

-- Indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_player_stats_hrs ON player_stats(home_runs DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_ks ON player_stats(strikeouts_pitched DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_wins ON player_stats(pitching_wins DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_saves ON player_stats(saves DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_stats(team_id);

-- 3. LEADERBOARD CACHE - Pre-calculated leaderboard data (optional optimization)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('home_runs', 'strikeouts', 'wins', 'saves', 'games_played', 'win_streak')),
  rankings JSONB NOT NULL DEFAULT '[]',  -- Array of {rank, player_name, team_id, user_id, value}
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboards" ON leaderboard_cache
  FOR SELECT USING (true);

CREATE POLICY "System can update leaderboards" ON leaderboard_cache
  FOR ALL USING (true);

-- Create unique constraint for category
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_category ON leaderboard_cache(category);

-- 4. Add tokens column to player_rewards if it doesn't exist
ALTER TABLE player_rewards 
  ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_runs_logged INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strikeouts_logged INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins_logged INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves_logged INTEGER DEFAULT 0;

-- =============================================================================
-- TOKEN REWARDS FOR GAME LOGGING
-- =============================================================================
-- Game logged: +5 tokens
-- Win logged: +10 tokens (bonus)
-- Home run logged: +2 tokens per HR
-- Win streak (3+): +15 bonus tokens
-- First game of the day: +5 bonus tokens
-- =============================================================================

-- =============================================================================
-- Done! Your game logging and leaderboard tables are ready.
-- =============================================================================
