-- SMS Registration Tracking
-- This migration adds SMS registration tracking to the user_onboarding table
-- Run this in Supabase SQL Editor

-- Add SMS registration tracking columns to user_onboarding table
ALTER TABLE user_onboarding 
ADD COLUMN IF NOT EXISTS sms_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_registered_at TIMESTAMP WITH TIME ZONE;

-- Create an index for faster queries on SMS registration status
CREATE INDEX IF NOT EXISTS idx_user_onboarding_sms_registered 
ON user_onboarding(sms_registered);

-- View to see all members who have completed SMS registration
-- This helps separate "applicants" from "active registered members"
CREATE OR REPLACE VIEW active_registered_members AS
SELECT 
  uo.user_id,
  uo.sms_registered,
  uo.sms_registered_at,
  uo.onboarding_completed,
  uo.onboarding_completed_at,
  u.team_id,
  u.display_name,
  u.username
FROM user_onboarding uo
LEFT JOIN users u ON u.id = uo.user_id
WHERE uo.sms_registered = true;

-- View to see members who have NOT completed SMS registration
-- Use this to identify who still needs to register
CREATE OR REPLACE VIEW members_pending_sms_registration AS
SELECT 
  uo.user_id,
  uo.sms_registered,
  uo.onboarding_completed,
  uo.created_at,
  u.team_id,
  u.display_name,
  u.username
FROM user_onboarding uo
LEFT JOIN users u ON u.id = uo.user_id
WHERE uo.sms_registered = false OR uo.sms_registered IS NULL;

-- Grant permissions
GRANT SELECT ON active_registered_members TO authenticated;
GRANT SELECT ON members_pending_sms_registration TO authenticated;
