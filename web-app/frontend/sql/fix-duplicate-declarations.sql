-- =============================================================================
-- FIX DUPLICATE DECLARATIONS
-- This script removes duplicate declarations and adds a unique constraint
-- =============================================================================

-- Step 1: View current duplicates (for verification)
SELECT 
  declaring_user_id,
  declaring_team_name,
  player_name,
  season_number,
  COUNT(*) as count,
  MIN(declared_at) as first_declaration,
  MAX(declared_at) as last_declaration
FROM free_agent_declarations
GROUP BY declaring_user_id, declaring_team_name, player_name, season_number
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates, keeping only the FIRST declaration (oldest)
-- This uses a CTE to identify which rows to delete
DELETE FROM free_agent_declarations
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY declaring_user_id, player_name, season_number 
        ORDER BY declared_at ASC
      ) as rn
    FROM free_agent_declarations
  ) duplicates
  WHERE rn > 1
);

-- Step 3: Add unique constraint to prevent future duplicates
-- A user can only declare the same player once per season
ALTER TABLE free_agent_declarations
DROP CONSTRAINT IF EXISTS unique_user_player_season;

ALTER TABLE free_agent_declarations
ADD CONSTRAINT unique_user_player_season 
UNIQUE (declaring_user_id, player_name, season_number);

-- Step 4: Verify no more duplicates exist
SELECT 
  declaring_user_id,
  player_name,
  season_number,
  COUNT(*) as count
FROM free_agent_declarations
GROUP BY declaring_user_id, player_name, season_number
HAVING COUNT(*) > 1;
-- Should return 0 rows
