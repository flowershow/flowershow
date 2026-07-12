-- ADR-0011: Site Name is the exact, case-sensitive lookup key, unique per user.
--
-- PRE-FLIGHT (run before deploying): this index creation will FAIL if any
-- (user_id, project_name) duplicates already exist. Uniqueness has been
-- app-enforced, so duplicates are unlikely, but verify first:
--
--   SELECT user_id, project_name, COUNT(*)
--   FROM "Site"
--   GROUP BY user_id, project_name
--   HAVING COUNT(*) > 1;
--
-- Resolve any rows returned before applying this migration.

-- CreateIndex
CREATE UNIQUE INDEX "Site_user_id_project_name_key" ON "Site"("user_id", "project_name");
