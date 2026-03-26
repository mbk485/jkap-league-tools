-- =============================================================================
-- Advance league to Spring Training (run in Supabase SQL Editor)
-- Matches app behavior: 48h ST window, offseason marked complete, claiming closed.
-- After running, members see ST UI; commissioners should still post to Discord
-- if announcements webhook is not used from the admin UI (webhook posts are client-side).
-- =============================================================================

UPDATE season_state
SET
  phase = 'spring_training',
  phase_started_at = NOW(),
  phase_deadline = NOW() + INTERVAL '48 hours',
  updated_at = NOW()
WHERE id = (
  SELECT id
  FROM season_state
  ORDER BY season_number DESC
  LIMIT 1
);

-- Single league settings row (adjust WHERE if you use multiple rows)
UPDATE league_settings
SET
  offseason_phase = 'complete',
  claiming_open = FALSE,
  claiming_closes_at = NULL,
  offseason_phase_updated_at = NOW(),
  updated_at = NOW()
WHERE id = (SELECT id FROM league_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1);
