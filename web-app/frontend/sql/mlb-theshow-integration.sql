-- =============================================================================
-- MLB The Show Integration Tables
-- 
-- These tables support:
-- - User roster management (My Team)
-- - Player tracking for buff/nerf alerts
-- - Exhibition game history
-- - Simulation results
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Player Cache Table
-- Caches Live Series player data from the MLB The Show API
-- This reduces API calls and provides faster search
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mlb_theshow_players (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    team_short_name TEXT NOT NULL,
    ovr INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    display_position TEXT NOT NULL,
    secondary_positions TEXT,
    is_hitter BOOLEAN NOT NULL,
    
    -- Key attributes (cached for quick display/search)
    contact_left INTEGER,
    contact_right INTEGER,
    power_left INTEGER,
    power_right INTEGER,
    speed INTEGER,
    fielding_ability INTEGER,
    arm_strength INTEGER,
    plate_vision INTEGER,
    plate_discipline INTEGER,
    
    -- Pitcher attributes
    stamina INTEGER,
    pitch_velocity INTEGER,
    pitch_control INTEGER,
    pitch_movement INTEGER,
    hits_per_bf INTEGER,
    k_per_bf INTEGER,
    bb_per_bf INTEGER,
    hr_per_bf INTEGER,
    
    -- Physical
    bat_hand TEXT,
    throw_hand TEXT,
    height TEXT,
    weight INTEGER,
    age INTEGER,
    
    -- Images
    img_url TEXT,
    baked_img_url TEXT,
    
    -- Full JSON for detailed view
    full_data JSONB,
    
    -- Calculated
    true_overall DECIMAL(5,2),
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_mlb_players_name ON mlb_theshow_players(name);
CREATE INDEX IF NOT EXISTS idx_mlb_players_team ON mlb_theshow_players(team_short_name);
CREATE INDEX IF NOT EXISTS idx_mlb_players_position ON mlb_theshow_players(display_position);
CREATE INDEX IF NOT EXISTS idx_mlb_players_ovr ON mlb_theshow_players(ovr DESC);
CREATE INDEX IF NOT EXISTS idx_mlb_players_rarity ON mlb_theshow_players(rarity);

-- -----------------------------------------------------------------------------
-- User Rosters Table
-- Stores each user's custom league roster
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Team',
    
    -- Lineup positions (store player UUIDs)
    lineup JSONB NOT NULL DEFAULT '{
        "C": null,
        "1B": null,
        "2B": null,
        "3B": null,
        "SS": null,
        "LF": null,
        "CF": null,
        "RF": null,
        "DH": null,
        "BENCH": [],
        "SP1": null,
        "SP2": null,
        "SP3": null,
        "SP4": null,
        "SP5": null,
        "RP": [],
        "CP": null
    }'::JSONB,
    
    -- Roster metadata
    total_ovr INTEGER DEFAULT 0,
    total_players INTEGER DEFAULT 0,
    
    -- Tracking
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_rosters_user_id ON user_rosters(user_id);

-- Ensure only one primary roster per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_rosters_primary 
ON user_rosters(user_id) WHERE is_primary = true;

-- -----------------------------------------------------------------------------
-- Player Watchlist Table
-- Tracks players a user wants to monitor for roster updates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    player_uuid TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_team TEXT NOT NULL,
    player_ovr INTEGER NOT NULL,
    
    -- Track when added and last OVR
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ovr_at_add INTEGER NOT NULL,
    
    -- Notification preferences
    notify_on_change BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, player_uuid)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON player_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_player_uuid ON player_watchlist(player_uuid);

-- -----------------------------------------------------------------------------
-- Roster Update History Table
-- Stores roster updates for buff/nerf tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roster_update_history (
    id SERIAL PRIMARY KEY,
    update_id INTEGER NOT NULL UNIQUE,
    update_name TEXT NOT NULL,
    update_date DATE NOT NULL,
    
    -- Store full update data
    changes JSONB NOT NULL,
    
    -- Metadata
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_updates_date ON roster_update_history(update_date DESC);

-- -----------------------------------------------------------------------------
-- Player Update Notifications Table
-- Stores notifications for users about their watched players
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_update_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    player_uuid TEXT NOT NULL,
    player_name TEXT NOT NULL,
    
    -- Change details
    old_ovr INTEGER NOT NULL,
    new_ovr INTEGER NOT NULL,
    change_direction TEXT NOT NULL CHECK (change_direction IN ('buff', 'nerf', 'unchanged')),
    attribute_changes JSONB,
    
    -- Notification status
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    roster_update_id INTEGER REFERENCES roster_update_history(id)
);

CREATE INDEX IF NOT EXISTS idx_player_notifications_user ON player_update_notifications(user_id, is_read);

-- -----------------------------------------------------------------------------
-- Exhibition Games Table
-- Stores simulated/exhibition game results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exhibition_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Players
    home_user_id UUID NOT NULL REFERENCES profiles(id),
    away_user_id UUID REFERENCES profiles(id), -- NULL for CPU games
    
    -- Rosters used (snapshot at game time)
    home_roster_snapshot JSONB NOT NULL,
    away_roster_snapshot JSONB NOT NULL,
    
    -- Final score
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    
    -- Game details
    innings INTEGER DEFAULT 9,
    game_type TEXT NOT NULL CHECK (game_type IN ('sim', 'exhibition', 'practice')),
    
    -- Play-by-play log (optional, for Watch Mode)
    play_by_play JSONB,
    
    -- Box score
    box_score JSONB,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_exhibition_games_home ON exhibition_games(home_user_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_games_away ON exhibition_games(away_user_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_games_date ON exhibition_games(started_at DESC);

-- -----------------------------------------------------------------------------
-- User Sim Stats Table
-- Aggregate stats from exhibition/sim games
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sim_stats (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Record
    sim_wins INTEGER DEFAULT 0,
    sim_losses INTEGER DEFAULT 0,
    sim_ties INTEGER DEFAULT 0,
    
    -- Totals
    total_games INTEGER DEFAULT 0,
    total_runs_scored INTEGER DEFAULT 0,
    total_runs_allowed INTEGER DEFAULT 0,
    total_hits INTEGER DEFAULT 0,
    total_home_runs INTEGER DEFAULT 0,
    total_strikeouts_pitched INTEGER DEFAULT 0,
    
    -- Streaks
    current_streak INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    
    -- Last updated
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE user_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_update_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibition_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sim_stats ENABLE ROW LEVEL SECURITY;

-- User rosters: users can only access their own
CREATE POLICY "Users can view own rosters"
ON user_rosters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rosters"
ON user_rosters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rosters"
ON user_rosters FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rosters"
ON user_rosters FOR DELETE
USING (auth.uid() = user_id);

-- Player watchlist: users can only access their own
CREATE POLICY "Users can view own watchlist"
ON player_watchlist FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own watchlist"
ON player_watchlist FOR ALL
USING (auth.uid() = user_id);

-- Notifications: users can only see their own
CREATE POLICY "Users can view own notifications"
ON player_update_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON player_update_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Exhibition games: users can see games they participated in
CREATE POLICY "Users can view own games"
ON exhibition_games FOR SELECT
USING (auth.uid() = home_user_id OR auth.uid() = away_user_id);

CREATE POLICY "Users can create games"
ON exhibition_games FOR INSERT
WITH CHECK (auth.uid() = home_user_id);

-- Sim stats: users can only see their own
CREATE POLICY "Users can view own sim stats"
ON user_sim_stats FOR SELECT
USING (auth.uid() = user_id);

-- Players cache is public (read-only for everyone)
ALTER TABLE mlb_theshow_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read player cache"
ON mlb_theshow_players FOR SELECT
USING (true);

-- Roster updates are public (read-only for everyone)
ALTER TABLE roster_update_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read roster updates"
ON roster_update_history FOR SELECT
USING (true);

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

-- Function to update roster totals when lineup changes
CREATE OR REPLACE FUNCTION update_roster_totals()
RETURNS TRIGGER AS $$
DECLARE
    total_ovr_sum INTEGER;
    player_count INTEGER;
BEGIN
    -- Calculate total OVR and player count from lineup
    -- This is a simplified version - full implementation would query player data
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for roster updates
DROP TRIGGER IF EXISTS trigger_update_roster_totals ON user_rosters;
CREATE TRIGGER trigger_update_roster_totals
    BEFORE UPDATE ON user_rosters
    FOR EACH ROW
    EXECUTE FUNCTION update_roster_totals();

-- Function to initialize user sim stats
CREATE OR REPLACE FUNCTION initialize_user_sim_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_sim_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Initialize roster for new users
CREATE OR REPLACE FUNCTION initialize_user_roster()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_rosters (user_id, name, is_primary)
    VALUES (NEW.id, 'My Team', true)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
