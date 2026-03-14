-- =============================================================================
-- ADD SEPARATE DISCORD WEBHOOK FOR COMMISSIONER ANNOUNCEMENTS
-- =============================================================================
-- This separates the IL Manager webhook from the Commissioner announcements webhook
-- 
-- discord_webhook_url = IL Manager (transactions channel)
-- discord_webhook_url_announcements = Commissioner (main announcements channel)
-- =============================================================================

-- Add the new column for announcements webhook
ALTER TABLE league_settings 
ADD COLUMN IF NOT EXISTS discord_webhook_url_announcements TEXT;

-- Set the announcements webhook (Commissioner main chat)
UPDATE league_settings 
SET discord_webhook_url_announcements = 'https://discord.com/api/webhooks/1482272343412969572/PNuW03iAKIEVrRGqnIOR97US51i6vOry-1DrcE6lhE79uuG0vw_W7eXnwvTTliJATcYl';

-- IMPORTANT: You need to re-enter your IL Manager webhook URL
-- Go to IL Manager settings and re-paste your IL webhook URL, OR run:
-- UPDATE league_settings SET discord_webhook_url = 'YOUR_IL_WEBHOOK_URL_HERE';

-- Verify the update
SELECT 
  discord_webhook_url as "IL Manager Webhook",
  discord_webhook_url_announcements as "Announcements Webhook"
FROM league_settings;
