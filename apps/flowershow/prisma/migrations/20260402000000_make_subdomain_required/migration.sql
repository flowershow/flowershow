-- Backfill subdomain for all existing sites that don't have one
-- Format: {project_name}-{username}
UPDATE "Site" s
SET subdomain = s.project_name || '-' || u.username
FROM "User" u
WHERE s.user_id = u.id
  AND s.subdomain IS NULL;

-- Make subdomain required (NOT NULL)
ALTER TABLE "Site" ALTER COLUMN "subdomain" SET NOT NULL;
