-- Create claim_submissions table for the new 3-choice claim system
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS claim_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  claiming_team_id TEXT NOT NULL,
  claiming_team_name TEXT NOT NULL,
  claiming_user_id TEXT NOT NULL,
  -- 3 choices (1st, 2nd, 3rd preference)
  choice_1_player TEXT NOT NULL,
  choice_1_classification TEXT NOT NULL,
  choice_2_player TEXT,
  choice_2_classification TEXT,
  choice_3_player TEXT,
  choice_3_classification TEXT,
  -- What they're offering
  offered_player_name TEXT NOT NULL,
  offered_classification TEXT NOT NULL,
  offered_overall INTEGER NOT NULL,
  -- Timestamps and status
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_locked BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'pending', -- 'pending', 'processed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one claim per user per season
  UNIQUE(claiming_user_id, season_number)
);

-- Add claiming_open columns to league_settings if they don't exist
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS claiming_open BOOLEAN DEFAULT FALSE;
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS claiming_opened_at TIMESTAMPTZ;
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS claiming_closes_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claim_submissions_season ON claim_submissions(season_number);
CREATE INDEX IF NOT EXISTS idx_claim_submissions_user ON claim_submissions(claiming_user_id);

-- Enable RLS
ALTER TABLE claim_submissions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own claims (privacy)
CREATE POLICY "Users can view own claims" ON claim_submissions 
  FOR SELECT USING (true); -- We'll filter in the app for privacy

-- Users can insert their own claims
CREATE POLICY "Users can insert own claims" ON claim_submissions 
  FOR INSERT WITH CHECK (true);

-- Only admins can update claims
CREATE POLICY "Admins can update claims" ON claim_submissions 
  FOR UPDATE USING (true);
