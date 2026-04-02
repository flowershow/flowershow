-- Backfill subdomain for regular user sites using {project_name}-{username} format.
-- Mirrors sanitizeSubdomain(): lowercase, replace invalid chars with hyphens,
-- collapse consecutive hyphens, strip leading/trailing hyphens, truncate to 63 chars.
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
  AND s.subdomain IS NULL;

-- Make subdomain required (NOT NULL)
ALTER TABLE "Site" ALTER COLUMN "subdomain" SET NOT NULL;
