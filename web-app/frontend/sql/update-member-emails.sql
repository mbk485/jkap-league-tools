-- =============================================================================
-- UPDATE MEMBER EMAILS TO MATCH TYPEFORM SUBMISSIONS
-- =============================================================================
-- Run this in your Supabase SQL Editor to match Typeform questionnaire emails
-- to your league members. This will make the Completion Tracker show green badges.
--
-- IMPORTANT: Review each mapping below before running!
-- Add/remove rows based on your actual member names and Typeform submissions.
-- =============================================================================

-- Based on Typeform responses (last 45 days):
-- 1. oreillymikeda@gmail.com
-- 2. stevenllanos11@icloud.com  
-- 3. elijahperez0118@gmail.com
-- 4. austinsoberanis@gmail.com
-- 5. floresweston344@gmail.com
-- 6. jguzman0624@gmail.com
-- 7. oliversmth09@gmail.com
-- 8. gregboswell1212@gmail.com
-- 9. jordyjpartida6@gmail.com
-- 10. mjr031183@gmail.com
-- 11. mroman2000@gmail.com
-- 12. royleem1996@icloud.com

-- =============================================================================
-- UPDATE MEMBER EMAILS BY NAME (adjust display_name to match your members)
-- =============================================================================

-- elijah perez → elijahperez0118@gmail.com
UPDATE users 
SET email = 'elijahperez0118@gmail.com' 
WHERE LOWER(display_name) LIKE '%elijah%perez%' 
  AND user_type = 'jkap_member';

-- Jonathan Guzman → jguzman0624@gmail.com
UPDATE users 
SET email = 'jguzman0624@gmail.com' 
WHERE LOWER(display_name) LIKE '%jonathan%guzman%' 
  AND user_type = 'jkap_member';

-- Greg Boswell → gregboswell1212@gmail.com
UPDATE users 
SET email = 'gregboswell1212@gmail.com' 
WHERE LOWER(display_name) LIKE '%greg%boswell%' 
  AND user_type = 'jkap_member';

-- Austin → austinsoberanis@gmail.com (username: austywoo)
UPDATE users 
SET email = 'austinsoberanis@gmail.com' 
WHERE (LOWER(display_name) = 'austin' OR LOWER(username) = 'austywoo')
  AND user_type = 'jkap_member';

-- Steven → stevenllanos11@icloud.com (username: l-spanglish-l)
UPDATE users 
SET email = 'stevenllanos11@icloud.com' 
WHERE (LOWER(display_name) = 'steven' OR LOWER(username) LIKE '%spanglish%')
  AND user_type = 'jkap_member';

-- Weston → floresweston344@gmail.com (username: heel)
UPDATE users 
SET email = 'floresweston344@gmail.com' 
WHERE (LOWER(display_name) = 'weston' OR LOWER(username) = 'heel')
  AND user_type = 'jkap_member';

-- Roy → royleem1996@icloud.com (username: gookedoutkid)
UPDATE users 
SET email = 'royleem1996@icloud.com' 
WHERE (LOWER(display_name) = 'roy' OR LOWER(username) = 'gookedoutkid')
  AND user_type = 'jkap_member';

-- Matt Roman → mroman2000@gmail.com (username: romanation)
UPDATE users 
SET email = 'mroman2000@gmail.com' 
WHERE (LOWER(display_name) LIKE '%matt%roman%' OR LOWER(username) = 'romanation')
  AND user_type = 'jkap_member';

-- Jordy → jordyjpartida6@gmail.com (username: jordybear44)
UPDATE users 
SET email = 'jordyjpartida6@gmail.com' 
WHERE (LOWER(display_name) = 'jordy' OR LOWER(username) LIKE '%jordy%')
  AND user_type = 'jkap_member';

-- Matt Robinson → mjr031183@gmail.com (username: maceedad1010)
UPDATE users 
SET email = 'mjr031183@gmail.com' 
WHERE (LOWER(display_name) LIKE '%matt%robinson%' OR LOWER(username) = 'maceedad1010')
  AND user_type = 'jkap_member';

-- =============================================================================
-- UNKNOWN MAPPINGS - Need to be matched manually
-- =============================================================================
-- oreillymikeda@gmail.com → Could be Michael @daddyhome or Mike O'Reilly?
-- oliversmth09@gmail.com → Could be Oliver Smith?

-- Example: If oreillymikeda@gmail.com is Michael (username: daddyhome)
-- UPDATE users 
-- SET email = 'oreillymikeda@gmail.com' 
-- WHERE LOWER(username) = 'daddyhome'
--   AND user_type = 'jkap_member';

-- =============================================================================
-- VERIFY THE UPDATES
-- =============================================================================
-- Run this to see which members now have emails set:

SELECT display_name, username, team_id, email 
FROM users 
WHERE user_type = 'jkap_member' 
  AND email IS NOT NULL
ORDER BY display_name;
