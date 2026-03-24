-- Season & Game Version Management System
-- Tracks MLB The Show game versions and seasons within each game

-- Add game_version to season_state table
ALTER TABLE season_state 
ADD COLUMN IF NOT EXISTS game_version VARCHAR(20) DEFAULT 'MLB The Show 25',
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archive_notes TEXT;

-- Create a table to track game versions
CREATE TABLE IF NOT EXISTS game_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "MLB The Show 25", "MLB The Show 26"
  short_name VARCHAR(10) NOT NULL UNIQUE,   -- e.g., "MTS25", "MTS26"
  release_year INTEGER NOT NULL,            -- e.g., 2025, 2026
  is_current BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  total_seasons INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create season archives table for historical records
CREATE TABLE IF NOT EXISTS season_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_version VARCHAR(50) NOT NULL,
  season_number INTEGER NOT NULL,
  -- Champion info
  champion_team_id VARCHAR(50),
  champion_team_name VARCHAR(100),
  champion_user_id TEXT,
  champion_user_name VARCHAR(100),
  -- MVP & Cy Young
  mvp_player_name VARCHAR(100),
  mvp_team VARCHAR(50),
  cy_young_player_name VARCHAR(100),
  cy_young_team VARCHAR(50),
  -- Stats
  total_games_played INTEGER,
  total_teams INTEGER,
  -- Draft info for next season
  draft_order JSONB,  -- Array of team IDs in draft order
  draft_pool JSONB,   -- Array of players available in draft
  -- Timestamps
  season_started_at TIMESTAMP,
  season_ended_at TIMESTAMP,
  archived_at TIMESTAMP DEFAULT NOW(),
  archived_by TEXT,
  notes TEXT,
  
  UNIQUE(game_version, season_number)
);

-- Insert default game versions
INSERT INTO game_versions (version_name, short_name, release_year, is_current, started_at)
VALUES 
  ('MLB The Show 25', 'MTS25', 2025, TRUE, NOW())
ON CONFLICT (version_name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_season_state_game_version ON season_state(game_version);
CREATE INDEX IF NOT EXISTS idx_season_state_is_current ON season_state(is_current);
CREATE INDEX IF NOT EXISTS idx_game_versions_is_current ON game_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_season_archives_game_version ON season_archives(game_version);

-- Update existing season_state records to have game_version
UPDATE season_state 
SET game_version = 'MLB The Show 25' 
WHERE game_version IS NULL;

-- Add contracted_teams array to league_settings
ALTER TABLE league_settings
ADD COLUMN IF NOT EXISTS contracted_teams TEXT[] DEFAULT ARRAY['LAD', 'CHC', 'ATL'];

-- Add draft_position to final_standings if not exists
ALTER TABLE final_standings
ADD COLUMN IF NOT EXISTS draft_position INTEGER;
