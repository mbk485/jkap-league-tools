-- =============================================================================
-- JTK LEAGUE OFF-SEASON MANAGEMENT TABLES
-- =============================================================================

-- Season State Table - Tracks which phase the league is in
CREATE TABLE IF NOT EXISTS season_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  phase TEXT NOT NULL DEFAULT 'pre_season',
  phase_started_at TIMESTAMPTZ DEFAULT NOW(),
  phase_deadline TIMESTAMPTZ,
  world_series_start TIMESTAMPTZ,
  world_series_end TIMESTAMPTZ,
  claiming_deadline TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valid phases: 
-- 'regular_season', 'postseason_sim', 'awards_voting', 'questionnaire',
-- 'free_agent_declaration', 'world_series', 'claiming_period', 
-- 'claim_resolution', 'roster_finalization', 'draft_prep', 'draft', 'pre_season'

-- Questionnaire Status - Tracks who has completed the off-season questionnaire
CREATE TABLE IF NOT EXISTS questionnaire_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  continuing_participation BOOLEAN DEFAULT TRUE,
  team_retention_preference TEXT DEFAULT 'keep', -- 'keep', 'switch', 'open'
  requested_team TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_number)
);

-- Free Agent Declarations - Players declared as free agents by their teams
CREATE TABLE IF NOT EXISTS free_agent_declarations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  declaring_team_id TEXT NOT NULL,
  declaring_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Player info
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  classification TEXT NOT NULL, -- 'common', 'bronze', 'silver', 'gold', 'diamond'
  overall_rating INTEGER NOT NULL,
  -- Status
  declared_at TIMESTAMPTZ DEFAULT NOW(),
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_by_team_id TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Free Agent Claims - Claims submitted during claiming period
CREATE TABLE IF NOT EXISTS free_agent_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  -- Who is claiming
  claiming_team_id TEXT NOT NULL,
  claiming_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claiming_team_record TEXT, -- e.g., '65-97' for priority resolution
  claiming_team_wins INTEGER,
  -- What they want
  target_free_agent_id UUID NOT NULL REFERENCES free_agent_declarations(id) ON DELETE CASCADE,
  target_player_name TEXT NOT NULL,
  target_classification TEXT NOT NULL,
  -- What they're offering in exchange
  offered_player_name TEXT NOT NULL,
  offered_position TEXT NOT NULL,
  offered_classification TEXT NOT NULL,
  offered_overall_rating INTEGER NOT NULL,
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'processed'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Final Standings - Locked standings at end of season
CREATE TABLE IF NOT EXISTS final_standings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_abbreviation TEXT NOT NULL,
  -- Record
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  win_percentage DECIMAL(4,3) DEFAULT 0,
  games_back DECIMAL(4,1) DEFAULT 0,
  -- Division/League ranking
  division TEXT,
  division_rank INTEGER,
  league_rank INTEGER,
  overall_rank INTEGER NOT NULL,
  -- Playoff status
  made_playoffs BOOLEAN DEFAULT FALSE,
  playoff_seed INTEGER,
  -- Recorded
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_number, team_id)
);

-- Awards Voting - Track MVP and Cy Young votes
CREATE TABLE IF NOT EXISTS award_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  mvp_vote TEXT NOT NULL, -- player name voted for
  cy_young_vote TEXT NOT NULL, -- player name voted for
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_number)
);

-- Award Winners - Store final award results
CREATE TABLE IF NOT EXISTS award_winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  award_type TEXT NOT NULL, -- 'mvp', 'cy_young'
  player_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  vote_count INTEGER NOT NULL,
  announced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_number, award_type)
);

-- Winter League Teams - Track non-playoff teams in winter league
CREATE TABLE IF NOT EXISTS winter_league_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_number, team_id)
);

-- Winter League Games - Track games played in winter league
CREATE TABLE IF NOT EXISTS winter_league_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner_team_id TEXT NOT NULL,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_questionnaire_user_season ON questionnaire_status(user_id, season_number);
CREATE INDEX IF NOT EXISTS idx_declarations_season ON free_agent_declarations(season_number);
CREATE INDEX IF NOT EXISTS idx_declarations_user ON free_agent_declarations(declaring_user_id);
CREATE INDEX IF NOT EXISTS idx_claims_season ON free_agent_claims(season_number);
CREATE INDEX IF NOT EXISTS idx_claims_user ON free_agent_claims(claiming_user_id);
CREATE INDEX IF NOT EXISTS idx_claims_target ON free_agent_claims(target_free_agent_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON final_standings(season_number);
CREATE INDEX IF NOT EXISTS idx_votes_season ON award_votes(season_number);
CREATE INDEX IF NOT EXISTS idx_winter_season ON winter_league_teams(season_number);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE season_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_agent_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_agent_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE winter_league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE winter_league_games ENABLE ROW LEVEL SECURITY;

-- Season State - Everyone can read, only admin can write
CREATE POLICY "Anyone can view season state" ON season_state FOR SELECT USING (true);
CREATE POLICY "Admins can update season state" ON season_state FOR ALL USING (true);

-- Questionnaire Status - Users can read/write own, admin can read all
CREATE POLICY "Users can view own questionnaire" ON questionnaire_status FOR SELECT USING (true);
CREATE POLICY "Users can insert own questionnaire" ON questionnaire_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own questionnaire" ON questionnaire_status FOR UPDATE USING (true);

-- Free Agent Declarations - Everyone can read, users can write own
CREATE POLICY "Anyone can view declarations" ON free_agent_declarations FOR SELECT USING (true);
CREATE POLICY "Users can insert declarations" ON free_agent_declarations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update declarations" ON free_agent_declarations FOR UPDATE USING (true);

-- Free Agent Claims - Everyone can read, users can write own
CREATE POLICY "Anyone can view claims" ON free_agent_claims FOR SELECT USING (true);
CREATE POLICY "Users can insert claims" ON free_agent_claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update claims" ON free_agent_claims FOR UPDATE USING (true);

-- Final Standings - Everyone can read
CREATE POLICY "Anyone can view standings" ON final_standings FOR SELECT USING (true);
CREATE POLICY "Admins can manage standings" ON final_standings FOR ALL USING (true);

-- Award Votes - Users can read/write own
CREATE POLICY "Anyone can view votes" ON award_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert votes" ON award_votes FOR INSERT WITH CHECK (true);

-- Award Winners - Everyone can read
CREATE POLICY "Anyone can view winners" ON award_winners FOR SELECT USING (true);
CREATE POLICY "Admins can manage winners" ON award_winners FOR ALL USING (true);

-- Winter League - Everyone can read, users can write own data
CREATE POLICY "Anyone can view winter league" ON winter_league_teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage winter league" ON winter_league_teams FOR ALL USING (true);

CREATE POLICY "Anyone can view winter games" ON winter_league_games FOR SELECT USING (true);
CREATE POLICY "Users can report winter games" ON winter_league_games FOR INSERT WITH CHECK (true);

-- =============================================================================
-- INITIAL DATA - Create Season 4
-- =============================================================================

INSERT INTO season_state (season_number, phase, notes)
VALUES (4, 'questionnaire', 'Season 4 Off-Season - Questionnaire Phase')
ON CONFLICT (season_number) DO NOTHING;

-- =============================================================================
-- MEMBER ACTIVITY TRACKING - For SMS/Contact Export
-- =============================================================================

-- Member Activity Status - Track active vs inactive members
CREATE TABLE IF NOT EXISTS member_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  activity_score INTEGER DEFAULT 100, -- 0-100, decays with inactivity
  -- Contact info for SMS/Email
  phone_number TEXT,
  sms_opted_in BOOLEAN DEFAULT TRUE,
  email_opted_in BOOLEAN DEFAULT TRUE,
  -- Season participation
  seasons_participated TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ['1', '2', '3', '4']
  total_games_played INTEGER DEFAULT 0,
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Activity Log - Track member engagement
CREATE TABLE IF NOT EXISTS member_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'game_played', 'questionnaire', 'vote', 'declaration', 'claim'
  activity_description TEXT,
  activity_at TIMESTAMPTZ DEFAULT NOW(),
  season_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Campaign Tracking - Track messages sent
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'questionnaire_reminder', 'phase_announcement', 'deadline_warning', 'custom'
  message_template TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sent'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity tables
CREATE INDEX IF NOT EXISTS idx_member_activity_active ON member_activity(is_active, last_active_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON member_activity_log(user_id, activity_at);

-- RLS for activity tables
ALTER TABLE member_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all member activity" ON member_activity FOR SELECT USING (true);
CREATE POLICY "Admins can manage member activity" ON member_activity FOR ALL USING (true);

CREATE POLICY "Users can view own activity log" ON member_activity_log FOR SELECT USING (true);
CREATE POLICY "System can insert activity log" ON member_activity_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage SMS campaigns" ON sms_campaigns FOR ALL USING (true);

-- =============================================================================
-- AWARD VOTING CANDIDATES - Top players for voting
-- =============================================================================

CREATE TABLE IF NOT EXISTS award_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  award_type TEXT NOT NULL, -- 'mvp', 'cy_young', 'rookie', 'relief'
  player_name TEXT NOT NULL,
  team_abbr TEXT NOT NULL,
  -- Stats (JSON for flexibility)
  stats JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Ranking
  rank_position INTEGER DEFAULT 0,
  is_finalist BOOLEAN DEFAULT FALSE,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_number, award_type, player_name)
);

CREATE INDEX IF NOT EXISTS idx_candidates_season ON award_candidates(season_number, award_type);
ALTER TABLE award_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view candidates" ON award_candidates FOR SELECT USING (true);
CREATE POLICY "Admins can manage candidates" ON award_candidates FOR ALL USING (true);
