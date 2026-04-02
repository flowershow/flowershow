-- Re-sanitize all subdomains to conform to DNS label rules:
--   lowercase, only a-z/0-9/-, collapse hyphens, strip leading/trailing hyphens, max 63 chars.
-- This fixes subdomains written by the previous migration which used naive concatenation.
UPDATE "Site" s
SET subdomain = LEFT(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(LOWER(s.project_name || '-' || u.username), '[^a-z0-9-]', '-', 'g'),
      '-+', '-', 'g'
    )
  ),
  63
)
FROM "User" u
WHERE s.user_id = u.id
  AND s.user_id != 'anon000000000000000000000000';

-- Sanitize anonymous site subdomains separately.
UPDATE "Site"
SET subdomain = LEFT(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(LOWER(project_name || '-anon'), '[^a-z0-9-]', '-', 'g'),
      '-+', '-', 'g'
    )
  ),
  63
)
WHERE user_id = 'anon000000000000000000000000';
