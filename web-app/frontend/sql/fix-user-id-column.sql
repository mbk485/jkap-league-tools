-- =============================================================================
-- FIX: Change declaring_user_id from UUID to TEXT
-- This allows the app to use string-based user IDs (admin-001, user-123, etc.)
-- =============================================================================

-- Drop the foreign key constraint first
ALTER TABLE free_agent_declarations 
DROP CONSTRAINT IF EXISTS free_agent_declarations_declaring_user_id_fkey;

-- Change the column type from UUID to TEXT
ALTER TABLE free_agent_declarations 
ALTER COLUMN declaring_user_id TYPE TEXT USING declaring_user_id::TEXT;

-- Do the same for free_agent_claims
ALTER TABLE free_agent_claims 
DROP CONSTRAINT IF EXISTS free_agent_claims_claiming_user_id_fkey;

ALTER TABLE free_agent_claims 
ALTER COLUMN claiming_user_id TYPE TEXT USING claiming_user_id::TEXT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'free_agent_declarations' 
AND column_name = 'declaring_user_id';
