-- =============================================================================
-- LEAGUE HIERARCHY SYSTEM ("Road to the Show")
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- 1. LEAGUES - Define the league tiers
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL,  -- 1=Majors, 2=Triple-A, 3=Double-A, 4=Single-A, 5=Rookie
  description TEXT,
  manager_name TEXT,  -- Commissioner/Manager of this league level
  monthly_salary INTEGER DEFAULT 0,  -- Token salary per month
  perks JSONB DEFAULT '[]',  -- List of perks/tools available at this level
  color TEXT,  -- Theme color for UI
  icon TEXT,  -- Icon name
  min_games_to_qualify INTEGER DEFAULT 10,
  min_win_rate NUMERIC DEFAULT 0.0,
  min_time_in_league_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY leagues_select ON leagues FOR SELECT USING (true);
CREATE POLICY leagues_all ON leagues FOR ALL USING (true);

-- Insert default league tiers
INSERT INTO leagues (id, name, level, description, manager_name, monthly_salary, color, icon, min_games_to_qualify, min_win_rate, min_time_in_league_days, perks) VALUES
('majors', 'The Majors', 1, 'The big leagues. Full access to all premium tools and maximum salary.', 'Commissioner', 500, '#dc2626', 'crown', 50, 0.55, 90, '["smart_recap", "scouting_reports", "roster_advice", "priority_support", "custom_graphics", "league_intel"]'),
('triple-a', 'Triple-A', 2, 'One step away from the show. Advanced tools and solid salary.', 'Miguel', 350, '#f59e0b', 'trophy', 40, 0.50, 60, '["smart_recap", "scouting_reports", "roster_advice"]'),
('double-a', 'Double-A', 3, 'Developing your skills. Growing access to tools.', 'Roy', 200, '#3b82f6', 'star', 30, 0.45, 45, '["smart_recap", "scouting_reports"]'),
('single-a', 'Single-A', 4, 'Learning the ropes. Basic tools to help you improve.', NULL, 100, '#22c55e', 'zap', 20, 0.40, 30, '["smart_recap"]'),
('rookie', 'Rookie Ball', 5, 'Welcome to the organization! Start your journey here.', NULL, 50, '#8b5cf6', 'user', 0, 0.0, 0, '[]')
ON CONFLICT (id) DO UPDATE SET
  monthly_salary = EXCLUDED.monthly_salary,
  perks = EXCLUDED.perks,
  min_games_to_qualify = EXCLUDED.min_games_to_qualify,
  min_win_rate = EXCLUDED.min_win_rate,
  min_time_in_league_days = EXCLUDED.min_time_in_league_days;

-- 2. USER_LEVELS - Track each user's current league level and progress
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_league_id TEXT REFERENCES leagues(id) DEFAULT 'rookie',
  
  -- Promotion tracking
  games_at_current_level INTEGER DEFAULT 0,
  wins_at_current_level INTEGER DEFAULT 0,
  days_in_league INTEGER DEFAULT 0,
  joined_league_at TIMESTAMPTZ DEFAULT NOW(),
  last_promotion_at TIMESTAMPTZ,
  last_demotion_at TIMESTAMPTZ,
  
  -- Qualification status (0-100%)
  qualification_percent INTEGER DEFAULT 0,
  is_qualified_for_promotion BOOLEAN DEFAULT false,
  
  -- History
  promotion_history JSONB DEFAULT '[]',  -- [{from: 'rookie', to: 'single-a', date: '...'}]
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_levels_select ON user_levels FOR SELECT USING (true);
CREATE POLICY user_levels_insert ON user_levels FOR INSERT WITH CHECK (true);
CREATE POLICY user_levels_update ON user_levels FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_league_id ON user_levels(current_league_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_qualified ON user_levels(is_qualified_for_promotion);

-- 3. USER_WALLETS - Token balances and salary tracking
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Token balance
  token_balance INTEGER DEFAULT 0,
  lifetime_tokens_earned INTEGER DEFAULT 0,
  lifetime_tokens_spent INTEGER DEFAULT 0,
  
  -- Salary tracking
  last_salary_paid_at TIMESTAMPTZ,
  next_salary_due_at TIMESTAMPTZ,
  
  -- Subscription (for future)
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due')),
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_wallets_select ON user_wallets FOR SELECT USING (true);
CREATE POLICY user_wallets_insert ON user_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY user_wallets_update ON user_wallets FOR UPDATE USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- 4. TOKEN_TRANSACTIONS - Track all token movements
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  amount INTEGER NOT NULL,  -- Positive for earned, negative for spent
  balance_after INTEGER NOT NULL,
  
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'salary', 'game_logged', 'win_bonus', 'streak_bonus', 
    'home_run_bonus', 'promotion_bonus', 'referral_bonus',
    'purchase_tool', 'purchase_report', 'admin_adjustment'
  )),
  
  description TEXT,
  metadata JSONB,  -- Extra data like {tool_id: 'scouting_report', opponent: 'NYY'}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_transactions_select ON token_transactions FOR SELECT USING (true);
CREATE POLICY token_transactions_insert ON token_transactions FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_date ON token_transactions(created_at DESC);

-- =============================================================================
-- TOKEN ECONOMY REFERENCE
-- =============================================================================
-- EARNING TOKENS:
-- - Monthly Salary: Based on league level (50-500 tokens)
-- - Game Logged: +5 tokens
-- - Win Bonus: +10 tokens
-- - Home Run: +2 tokens per HR
-- - 3+ Win Streak: +15 tokens
-- - Promotion: +100 tokens
-- - Referral: +50 tokens
--
-- SPENDING TOKENS:
-- - Smart Recap (one-time): 25 tokens
-- - Scouting Report: 50 tokens
-- - Roster Advice: 75 tokens
-- - Priority Support: 100 tokens
-- =============================================================================

-- =============================================================================
-- Done! Your league hierarchy and token economy tables are ready.
-- =============================================================================
