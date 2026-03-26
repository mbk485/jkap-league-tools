-- =============================================================================
-- JKAP MEMORIAL LEAGUE - TRADE SYSTEM DATABASE SCHEMA
-- =============================================================================
-- Run this in Supabase SQL Editor to set up the trades system

-- 1. Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Proposing team info
  proposing_team_abbr VARCHAR(5) NOT NULL,
  proposing_team_name VARCHAR(100) NOT NULL,
  proposing_user_id UUID REFERENCES auth.users(id),
  proposing_username VARCHAR(50),
  
  -- Receiving team info
  receiving_team_abbr VARCHAR(5) NOT NULL,
  receiving_team_name VARCHAR(100) NOT NULL,
  receiving_user_id UUID REFERENCES auth.users(id),
  receiving_username VARCHAR(50),
  
  -- Trade status
  status VARCHAR(20) NOT NULL DEFAULT 'proposed' 
    CHECK (status IN ('draft', 'proposed', 'countered', 'accepted', 'submitted', 'under_review', 'approved', 'denied', 'expired', 'withdrawn')),
  
  -- Players involved (stored as JSON arrays)
  players_offered JSONB NOT NULL DEFAULT '[]',
  players_requested JSONB NOT NULL DEFAULT '[]',
  
  -- Messages and notes
  proposer_message TEXT,
  counter_message TEXT,
  committee_notes TEXT,
  reviewed_by VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Season tracking
  season_id VARCHAR(50),
  
  -- Discord message ID (for updating the message after review)
  discord_message_id VARCHAR(50)
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_proposing_team ON trades(proposing_team_abbr);
CREATE INDEX IF NOT EXISTS idx_trades_receiving_team ON trades(receiving_team_abbr);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_proposing_user ON trades(proposing_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiving_user ON trades(receiving_user_id);

-- 3. Create trade_players junction table for detailed player tracking
CREATE TABLE IF NOT EXISTS trade_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  player_name VARCHAR(100) NOT NULL,
  player_position VARCHAR(20),
  player_overall INTEGER,
  player_tier VARCHAR(20),
  from_team_abbr VARCHAR(5) NOT NULL,
  to_team_abbr VARCHAR(5) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_players_trade_id ON trade_players(trade_id);

-- 4. Create trade_notifications table
CREATE TABLE IF NOT EXISTS trade_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  notification_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_notifications_user ON trade_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_trade ON trade_notifications(trade_id);

-- 5. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trades_updated_at_trigger ON trades;
CREATE TRIGGER trades_updated_at_trigger
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trades_updated_at();

-- 7. Create function to auto-expire old trades
CREATE OR REPLACE FUNCTION expire_old_trades()
RETURNS void AS $$
BEGIN
  UPDATE trades
  SET status = 'expired'
  WHERE status IN ('proposed', 'countered')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Create view for active trades (for dashboard)
CREATE OR REPLACE VIEW active_trades AS
SELECT 
  t.*,
  (SELECT COUNT(*) FROM trade_players tp WHERE tp.trade_id = t.id) as player_count
FROM trades t
WHERE t.status IN ('proposed', 'countered', 'accepted', 'submitted', 'under_review')
ORDER BY t.created_at DESC;

-- 9. Create view for trade history with stats
CREATE OR REPLACE VIEW trade_history_stats AS
SELECT 
  t.proposing_team_abbr,
  t.proposing_team_name,
  COUNT(*) FILTER (WHERE t.status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE t.status = 'denied') as denied_count,
  COUNT(*) FILTER (WHERE t.status = 'withdrawn') as withdrawn_count,
  COUNT(*) as total_trades
FROM trades t
GROUP BY t.proposing_team_abbr, t.proposing_team_name;

-- 10. Create function to get trades for a user
CREATE OR REPLACE FUNCTION get_user_trades(p_user_id UUID)
RETURNS TABLE (
  trade_id UUID,
  role TEXT,
  other_team TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trade_id,
    CASE 
      WHEN t.proposing_user_id = p_user_id THEN 'proposer'
      ELSE 'receiver'
    END as role,
    CASE 
      WHEN t.proposing_user_id = p_user_id THEN t.receiving_team_name
      ELSE t.proposing_team_name
    END as other_team,
    t.status,
    t.created_at
  FROM trades t
  WHERE t.proposing_user_id = p_user_id 
     OR t.receiving_user_id = p_user_id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Row Level Security (RLS) policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notifications ENABLE ROW LEVEL SECURITY;

-- Trades: Users can see trades they're involved in, admins can see all
CREATE POLICY "Users can view their trades" ON trades
  FOR SELECT USING (
    auth.uid() = proposing_user_id 
    OR auth.uid() = receiving_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Trades: Users can create trades
CREATE POLICY "Users can create trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = proposing_user_id);

-- Trades: Users can update trades they're involved in
CREATE POLICY "Users can update their trades" ON trades
  FOR UPDATE USING (
    auth.uid() = proposing_user_id 
    OR auth.uid() = receiving_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Trade notifications: Users can only see their own notifications
CREATE POLICY "Users see own notifications" ON trade_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Trade notifications: System can create notifications
CREATE POLICY "System creates notifications" ON trade_notifications
  FOR INSERT WITH CHECK (true);

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE ON trades TO authenticated;
GRANT SELECT, INSERT ON trade_players TO authenticated;
GRANT SELECT, UPDATE ON trade_notifications TO authenticated;
GRANT SELECT ON active_trades TO authenticated;
GRANT SELECT ON trade_history_stats TO authenticated;

-- =============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- =============================================================================

-- Uncomment below to insert sample trade data for testing
/*
INSERT INTO trades (
  proposing_team_abbr, proposing_team_name, proposing_username,
  receiving_team_abbr, receiving_team_name, receiving_username,
  status, players_offered, players_requested, proposer_message,
  expires_at
) VALUES (
  'SEA', 'Seattle Mariners', 'player1',
  'ARI', 'Arizona Diamondbacks', 'murphi',
  'proposed',
  '[{"name": "Bobby Witt Jr.", "position": "SS", "overall": 91, "tier": "diamond"}]',
  '[{"name": "Mookie Betts", "position": "RF", "overall": 96, "tier": "diamond"}]',
  'Looking to upgrade at SS!',
  NOW() + INTERVAL '48 hours'
);
*/
