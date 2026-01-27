-- =============================================================================
-- MEMBER MANAGEMENT SYSTEM TABLES
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- LEAGUE SETTINGS - Centralized settings for the entire league
CREATE TABLE IF NOT EXISTS league_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_webhook_url TEXT,
  auto_post_discord BOOLEAN DEFAULT false,
  announcement_style TEXT DEFAULT 'espn' CHECK (announcement_style IN ('espn', 'simple')),
  openai_api_key TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings, admins can modify
CREATE POLICY "Anyone can view league settings" ON league_settings
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert league settings" ON league_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update league settings" ON league_settings
  FOR UPDATE USING (true);

-- Insert default settings row if not exists
INSERT INTO league_settings (discord_webhook_url, auto_post_discord, announcement_style)
VALUES (null, false, 'espn')
ON CONFLICT DO NOTHING;

-- 0. IL Placements - Injured List placements for all teams
CREATE TABLE IF NOT EXISTS il_placements (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_position TEXT NOT NULL,
  player_type TEXT CHECK (player_type IN ('pitcher', 'position')),
  injury_type TEXT NOT NULL,
  start_game INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_game INTEGER,
  end_date TEXT,
  games_on_il INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE il_placements ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read IL placements, anyone can insert/update
CREATE POLICY "Anyone can view IL placements" ON il_placements
  FOR SELECT USING (true);

CREATE POLICY "Anyone can add IL placements" ON il_placements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update IL placements" ON il_placements
  FOR UPDATE USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_il_placements_team_id ON il_placements(team_id);
CREATE INDEX IF NOT EXISTS idx_il_placements_status ON il_placements(status);

-- 1. Registration Queue - New players awaiting approval
CREATE TABLE IF NOT EXISTS registration_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  psn_id TEXT,
  discord_username TEXT,
  requested_team_id TEXT NOT NULL,
  approval_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE registration_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (to register), admins can read/update
CREATE POLICY "Anyone can submit registration" ON registration_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all registrations" ON registration_queue
  FOR SELECT USING (true);

CREATE POLICY "Admins can update registrations" ON registration_queue
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete registrations" ON registration_queue
  FOR DELETE USING (true);

-- 2. Ban List - Blocked players who cannot re-register
CREATE TABLE IF NOT EXISTS ban_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  psn_id TEXT,
  discord_username TEXT,
  original_team_id TEXT,
  ban_type TEXT DEFAULT 'removed' CHECK (ban_type IN ('removed', 'banned')),
  ban_reason TEXT NOT NULL,
  banned_at TIMESTAMPTZ DEFAULT NOW(),
  banned_by TEXT NOT NULL,
  can_appeal BOOLEAN DEFAULT true,
  appeal_notes TEXT
);

-- Enable RLS
ALTER TABLE ban_list ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read (to check if banned), admins can modify
CREATE POLICY "Anyone can check ban status" ON ban_list
  FOR SELECT USING (true);

CREATE POLICY "Admins can add to ban list" ON ban_list
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update ban list" ON ban_list
  FOR UPDATE USING (true);

CREATE POLICY "Admins can remove from ban list" ON ban_list
  FOR DELETE USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ban_list_username ON ban_list(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_ban_list_email ON ban_list(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_ban_list_phone ON ban_list(phone);
CREATE INDEX IF NOT EXISTS idx_ban_list_psn_id ON ban_list(LOWER(psn_id));

-- 3. Team Statuses - Track team availability
CREATE TABLE IF NOT EXISTS team_statuses (
  team_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'open' CHECK (status IN ('occupied', 'open', 'reserved')),
  occupied_by UUID REFERENCES users(id),
  reserved_for TEXT,
  reserved_until TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_statuses ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read, admins can modify
CREATE POLICY "Anyone can view team statuses" ON team_statuses
  FOR SELECT USING (true);

CREATE POLICY "Admins can update team statuses" ON team_statuses
  FOR ALL USING (true);

-- 4. Member Activity - Track user actions for activity monitoring
CREATE TABLE IF NOT EXISTS member_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT,
  activity_type TEXT CHECK (activity_type IN ('game_played', 'game_recap', 'analysis_upload', 'login', 'il_move')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE member_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own, admins can read all
CREATE POLICY "Users can log their activity" ON member_activity
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view activity" ON member_activity
  FOR SELECT USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_member_activity_user_id ON member_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_member_activity_created_at ON member_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_member_activity_type ON member_activity(activity_type);

-- 5. Welcome Packets - Templates for new member onboarding
CREATE TABLE IF NOT EXISTS welcome_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  rules_link TEXT,
  discord_link TEXT,
  facebook_link TEXT,
  schedule_link TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE welcome_packets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read, admins can modify
CREATE POLICY "Anyone can view welcome packets" ON welcome_packets
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage welcome packets" ON welcome_packets
  FOR ALL USING (true);

-- Insert a default welcome packet
INSERT INTO welcome_packets (title, welcome_message, discord_link, facebook_link, rules_link, is_active)
VALUES (
  'Welcome to JKAP Memorial League!',
  'Hey {{name}}, welcome to the family! 🏆

You''ve been assigned to manage the {{team}}. Let''s get you set up for success!

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 YOUR FIRST WEEK CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Complete the in-app onboarding
✅ Join "Jkapmemorial" league in MLB The Show
✅ Join our Discord server
✅ Join our Facebook group
✅ Introduce yourself to the league
✅ Play your first 3 games

━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 LEAGUE ESSENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Play minimum 3 games per week
• Log every game in the Game Logger
• IL placements require 5-game minimum stint
• Trade deadline is Week 12 (check announcements)
• Check Discord daily for matchup updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 PRO TIPS FOR NEW MANAGERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Use the Players Academy to analyze your gameplay
• Create Game Recaps to track your progress
• Communicate with opponents about scheduling
• Ask questions - we''re here to help!

━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? DM the commissioner anytime.

Welcome aboard, and let''s play ball! ⚾',
  'https://discord.gg/your-server',
  'https://facebook.com/groups/your-group',
  'https://jkapmemorial.com/documents',
  true
) ON CONFLICT DO NOTHING;

-- 6. Player Rewards - Gamification system (streaks, badges, points)
CREATE TABLE IF NOT EXISTS player_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  games_played INTEGER DEFAULT 0,
  recaps_created INTEGER DEFAULT 0,
  analyses_uploaded INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE player_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own, admins can view all
CREATE POLICY "Users can view their own rewards" ON player_rewards
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own rewards" ON player_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own rewards" ON player_rewards
  FOR UPDATE USING (true);

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_player_rewards_total_points ON player_rewards(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_player_rewards_user_id ON player_rewards(user_id);

-- 7. Game Results - Track game outcomes for standings
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  winner_team_id TEXT NOT NULL,
  loser_team_id TEXT NOT NULL,
  home_user_id UUID REFERENCES users(id),
  away_user_id UUID REFERENCES users(id),
  game_date DATE DEFAULT CURRENT_DATE,
  season TEXT,
  notes TEXT,
  key_players JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read games, authenticated users can insert
CREATE POLICY "Anyone can view game results" ON game_results
  FOR SELECT USING (true);

CREATE POLICY "Users can record game results" ON game_results
  FOR INSERT WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_game_results_home_team ON game_results(home_team_id);
CREATE INDEX IF NOT EXISTS idx_game_results_away_team ON game_results(away_team_id);
CREATE INDEX IF NOT EXISTS idx_game_results_winner ON game_results(winner_team_id);
CREATE INDEX IF NOT EXISTS idx_game_results_date ON game_results(game_date DESC);

-- 8. User Onboarding - Track which onboarding steps users have completed
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  rules_acknowledged BOOLEAN DEFAULT false,
  rules_acknowledged_at TIMESTAMPTZ,
  welcome_viewed BOOLEAN DEFAULT false,
  welcome_viewed_at TIMESTAMPTZ,
  discord_joined BOOLEAN DEFAULT false,
  facebook_joined BOOLEAN DEFAULT false,
  psn_friends_added BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own
CREATE POLICY "Users can view their onboarding" ON user_onboarding
  FOR SELECT USING (true);

CREATE POLICY "Users can insert onboarding" ON user_onboarding
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update onboarding" ON user_onboarding
  FOR UPDATE USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- =============================================================================
-- Done! Your member management system tables are ready.
-- =============================================================================
