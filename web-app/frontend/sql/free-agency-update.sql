-- =============================================================================
-- FREE AGENCY DECLARATION UPDATES - Season 5
-- Adds locking, MLB The Show integration, and team name tracking
-- =============================================================================

-- Add new columns to free_agent_declarations table
ALTER TABLE free_agent_declarations 
ADD COLUMN IF NOT EXISTS player_uuid TEXT,
ADD COLUMN IF NOT EXISTS card_img TEXT,
ADD COLUMN IF NOT EXISTS team_short_name TEXT,
ADD COLUMN IF NOT EXISTS declaring_team_name TEXT,
ADD COLUMN IF NOT EXISTS declaring_user_name TEXT,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Update existing records to be locked
UPDATE free_agent_declarations 
SET is_locked = TRUE, locked_at = declared_at 
WHERE is_locked IS NULL OR locked_at IS NULL;

-- Add comment explaining the locking rule
COMMENT ON COLUMN free_agent_declarations.is_locked IS 'Once a declaration is submitted, it cannot be removed or edited';
COMMENT ON COLUMN free_agent_declarations.locked_at IS 'Timestamp when the declaration was locked (same as declared_at)';

-- =============================================================================
-- TEAM ROSTERS TABLE - For tracking player rosters (optional for members)
-- =============================================================================

CREATE TABLE IF NOT EXISTS team_rosters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  -- Roster data stored as JSON for flexibility
  roster_data JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Total roster stats
  total_players INTEGER DEFAULT 0,
  avg_overall DECIMAL(5,2) DEFAULT 0,
  diamond_count INTEGER DEFAULT 0,
  gold_count INTEGER DEFAULT 0,
  silver_count INTEGER DEFAULT 0,
  bronze_count INTEGER DEFAULT 0,
  common_count INTEGER DEFAULT 0,
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_number)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_team_rosters_user_season ON team_rosters(user_id, season_number);
CREATE INDEX IF NOT EXISTS idx_team_rosters_season ON team_rosters(season_number);

-- Enable RLS
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read all rosters, but only write their own
CREATE POLICY "Anyone can view team rosters" ON team_rosters FOR SELECT USING (true);
CREATE POLICY "Users can insert own roster" ON team_rosters FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own roster" ON team_rosters FOR UPDATE USING (true);

-- =============================================================================
-- DECLARATION ACTIVITY LOG - Track all declaration submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS declaration_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID REFERENCES free_agent_declarations(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  team_name TEXT,
  action_type TEXT NOT NULL, -- 'submitted', 'viewed', 'claimed'
  player_name TEXT NOT NULL,
  position TEXT,
  classification TEXT,
  overall_rating INTEGER,
  player_uuid TEXT,
  ip_address TEXT,
  user_agent TEXT,
  activity_at TIMESTAMPTZ DEFAULT NOW(),
  season_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_declaration_log_season ON declaration_activity_log(season_number);
CREATE INDEX IF NOT EXISTS idx_declaration_log_user ON declaration_activity_log(user_id);

ALTER TABLE declaration_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view declaration log" ON declaration_activity_log FOR SELECT USING (true);
CREATE POLICY "System can insert declaration log" ON declaration_activity_log FOR INSERT WITH CHECK (true);
