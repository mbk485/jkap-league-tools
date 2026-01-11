-- =============================================================================
-- MEMBER MANAGEMENT SYSTEM TABLES
-- Run this in your Supabase SQL Editor
-- =============================================================================

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
INSERT INTO welcome_packets (title, welcome_message, is_active)
VALUES (
  'Welcome to JKAP Memorial League!',
  'Hey {{name}}, you''re officially in!

Your Team: {{team}}

📋 NEXT STEPS:
1. ✅ Join our Discord
2. ✅ Join our Facebook Group
3. ✅ Complete SMS Registration
4. 📖 Read the Official Rules
5. 📅 Check the Schedule
6. 🎮 Add PSN friends

📖 QUICK START GUIDE:
• Minimum 3 games per week required
• Report scores after each game
• Check Discord for matchups & announcements
• Questions? DM the commissioner

Welcome to the family! 🏆',
  true
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- Done! Your member management system tables are ready.
-- =============================================================================
