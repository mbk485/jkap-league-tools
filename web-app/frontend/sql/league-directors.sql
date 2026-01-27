-- =============================================================================
-- LEAGUE DIRECTORS (Minor League Managers)
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Add league director fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_league_director BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_league_id TEXT REFERENCES leagues(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS director_title TEXT;

-- Update leagues table to link director user IDs
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS director_user_id UUID REFERENCES users(id);

-- =============================================================================
-- SET UP MIGUEL AS TRIPLE-A DIRECTOR
-- Replace 'miguel-user-id' with Miguel's actual user ID from the users table
-- =============================================================================
-- To find Miguel's user ID, run:
-- SELECT id, username, display_name FROM users WHERE display_name ILIKE '%miguel%';

-- Then update Miguel:
-- UPDATE users SET 
--   is_league_director = true,
--   managed_league_id = 'triple-a',
--   director_title = 'Triple-A Director'
-- WHERE id = 'miguel-user-id';

-- And link to the league:
-- UPDATE leagues SET director_user_id = 'miguel-user-id' WHERE id = 'triple-a';

-- =============================================================================
-- SET UP ROY AS DOUBLE-A DIRECTOR
-- Replace 'roy-user-id' with Roy's actual user ID from the users table
-- =============================================================================
-- To find Roy's user ID, run:
-- SELECT id, username, display_name FROM users WHERE display_name ILIKE '%roy%';

-- Then update Roy:
-- UPDATE users SET 
--   is_league_director = true,
--   managed_league_id = 'double-a',
--   director_title = 'Double-A Director'
-- WHERE id = 'roy-user-id';

-- And link to the league:
-- UPDATE leagues SET director_user_id = 'roy-user-id' WHERE id = 'double-a';

-- =============================================================================
-- WHAT LEAGUE DIRECTORS CAN DO:
-- =============================================================================
-- 1. View all players in their assigned league level
-- 2. See activity stats for their players
-- 3. Recommend players for promotion to the Commissioner
-- 4. Send announcements to their league
-- 5. View qualification progress for all their players
--
-- WHAT THEY CANNOT DO:
-- - Approve promotions (Commissioner only)
-- - Access the main Admin panel
-- - Manage settings or integrations
-- - View League Intel Center
-- =============================================================================
