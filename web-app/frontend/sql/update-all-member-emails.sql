-- Update member emails to match Typeform submissions
-- Run this in Supabase SQL Editor

-- Roy Morrow
UPDATE users SET email = 'royleem1996@icloud.com' 
WHERE LOWER(display_name) LIKE '%roy%morrow%' OR LOWER(display_name) LIKE '%morrow%roy%';

-- Kenny Kingsley
UPDATE users SET email = 'kkingsley125125@gmail.com' 
WHERE LOWER(display_name) LIKE '%kenny%kingsley%' OR LOWER(display_name) LIKE '%kingsley%kenny%';

-- Brett Smith
UPDATE users SET email = 'brettbballin@gmail.com' 
WHERE LOWER(display_name) LIKE '%brett%smith%' OR LOWER(display_name) LIKE '%smith%brett%';

-- Matt Robinson
UPDATE users SET email = 'mjr031183@gmail.com' 
WHERE LOWER(display_name) LIKE '%matt%robinson%' OR LOWER(display_name) LIKE '%robinson%matt%';

-- Weston Flores
UPDATE users SET email = 'floresweston344@gmail.com' 
WHERE LOWER(display_name) LIKE '%weston%flores%' OR LOWER(display_name) LIKE '%flores%weston%';

-- Kevin Williams
UPDATE users SET email = 'kevarronwilliams@gmail.com' 
WHERE LOWER(display_name) LIKE '%kevin%williams%' OR LOWER(display_name) LIKE '%williams%kevin%';

-- Douglas Martinez
UPDATE users SET email = 'mbrychris@aol.com' 
WHERE LOWER(display_name) LIKE '%douglas%martinez%' OR LOWER(display_name) LIKE '%martinez%douglas%';

-- Darius Brito
UPDATE users SET email = 'dariusbrito7@gmail.com' 
WHERE LOWER(display_name) LIKE '%darius%brito%' OR LOWER(display_name) LIKE '%brito%darius%' OR LOWER(display_name) LIKE '%darius%';

-- Mike O'Reilly (Rockies owner)
UPDATE users SET email = 'oreillymikeda@gmail.com' 
WHERE LOWER(display_name) LIKE '%mike%o''reilly%' OR LOWER(display_name) LIKE '%o''reilly%mike%' 
   OR LOWER(display_name) LIKE '%mike%oreilly%' OR LOWER(display_name) LIKE '%oreilly%';

-- Steven Llanos
UPDATE users SET email = 'stevenllanos11@icloud.com' 
WHERE LOWER(display_name) LIKE '%steven%llanos%' OR LOWER(display_name) LIKE '%llanos%steven%';

-- Elijah Perez
UPDATE users SET email = 'elijahperez0118@gmail.com' 
WHERE LOWER(display_name) LIKE '%elijah%perez%' OR LOWER(display_name) LIKE '%perez%elijah%';

-- Austin Soberanis
UPDATE users SET email = 'austinsoberanis@gmail.com' 
WHERE LOWER(display_name) LIKE '%austin%soberanis%' OR LOWER(display_name) LIKE '%soberanis%austin%';

-- Jonathan Guzman
UPDATE users SET email = 'jguzman0624@gmail.com' 
WHERE LOWER(display_name) LIKE '%jonathan%guzman%' OR LOWER(display_name) LIKE '%guzman%jonathan%';

-- James Smith (filled out as oliversmth09)
UPDATE users SET email = 'oliversmth09@gmail.com' 
WHERE LOWER(display_name) LIKE '%james%smith%' OR LOWER(display_name) LIKE '%smith%james%';

-- Greg Boswell
UPDATE users SET email = 'gregboswell1212@gmail.com' 
WHERE LOWER(display_name) LIKE '%greg%boswell%' OR LOWER(display_name) LIKE '%boswell%greg%';

-- Jordy Partida
UPDATE users SET email = 'jordyjpartida6@gmail.com' 
WHERE LOWER(display_name) LIKE '%jordy%partida%' OR LOWER(display_name) LIKE '%partida%jordy%';

-- Matt Roman
UPDATE users SET email = 'mroman2000@gmail.com' 
WHERE LOWER(display_name) LIKE '%matt%roman%' OR LOWER(display_name) LIKE '%roman%matt%';

-- Verify which users now have emails set
SELECT display_name, team_id, email 
FROM users 
WHERE user_type = 'jkap_member' OR user_type IS NULL
ORDER BY display_name;
