-- Migrate dashboard-set `config_json.title` into `project_name`.
--
-- The site brand (SEO title suffix, navbar, footer, RSS) now resolves to
-- siteName ?? title(deprecated) ?? projectName, and the dashboard "Site Title"
-- field has been removed. Sites that set a title via the dashboard have it in
-- config_json.title, where it still applies (via the read-time alias) but is no
-- longer visible/editable and silently overrides the dashboard "Name" field.
-- This migration makes project_name the single source of truth: set project_name
-- to the title and drop the title key. The public URL derives from
-- subdomain/custom_domain (never project_name), so this does not change any
-- site's URL -- it is equivalent to a bulk rename.
--
-- A site is left UNTOUCHED (its title kept, so the alias keeps applying it) when
-- the title cannot become a valid, unique project_name:
--   - fails Site Name validation: empty, no ASCII alphanumeric, contains "/", or
--     has control characters (dashboard titles were only length-capped, so these
--     are possible), or longer than 100 chars
--   - would collide with another of the same user's sites (unique[user, name]),
--     including the case where two of a user's sites resolve to the same name
-- Whitespace is trimmed to match the app's validateSiteName().
--
-- PRE-FLIGHT preview (safe, read-only): run this first to see what will happen
-- to every site that has a dashboard title -- rename / clean / SKIP:
--
--   WITH norm AS (
--     SELECT id, user_id, project_name,
--            regexp_replace(config_json->>'title', '^\s+|\s+$', '', 'g') AS new_name
--     FROM "Site" WHERE jsonb_typeof(config_json->'title') = 'string'
--   )
--   SELECT n.project_name AS old_name, n.new_name,
--     CASE
--       WHEN n.new_name = n.project_name THEN 'clean (remove key)'
--       WHEN char_length(n.new_name) NOT BETWEEN 1 AND 100
--            OR n.new_name !~ '[A-Za-z0-9]'
--            OR n.new_name LIKE '%/%'
--            OR n.new_name ~ '[[:cntrl:]]' THEN 'SKIP invalid'
--       WHEN EXISTS (SELECT 1 FROM "Site" o
--                    WHERE o.user_id = n.user_id AND o.project_name = n.new_name AND o.id <> n.id)
--            OR (SELECT count(*) FROM norm m WHERE m.user_id = n.user_id AND m.new_name = n.new_name) > 1
--            THEN 'SKIP collision'
--       ELSE 'rename'
--     END AS action
--   FROM norm n ORDER BY action, old_name;

-- 1) Title already equals project_name: just drop the redundant key.
UPDATE "Site"
SET config_json = config_json - 'title'
WHERE jsonb_typeof(config_json->'title') = 'string'
  AND regexp_replace(config_json->>'title', '^\s+|\s+$', '', 'g') = project_name;

-- 2) Valid + unique title: set project_name and drop the key.
WITH norm AS (
  SELECT
    id,
    user_id,
    project_name,
    regexp_replace(config_json->>'title', '^\s+|\s+$', '', 'g') AS new_name
  FROM "Site"
  WHERE jsonb_typeof(config_json->'title') = 'string'
),
cand AS (
  SELECT id, user_id, new_name
  FROM norm
  WHERE new_name <> project_name
    AND char_length(new_name) BETWEEN 1 AND 100
    AND new_name ~ '[A-Za-z0-9]'          -- at least one ASCII alphanumeric
    AND new_name NOT LIKE '%/%'           -- no "/"
    AND new_name !~ '[[:cntrl:]]'         -- no control characters
),
-- Only names that are unique among this user's candidates (drops same-user dupes).
uniq_cand AS (
  SELECT user_id, new_name
  FROM cand
  GROUP BY user_id, new_name
  HAVING count(*) = 1
),
-- ...and that no other existing site of the same user already owns.
eligible AS (
  SELECT c.id, c.new_name
  FROM cand c
  JOIN uniq_cand u ON u.user_id = c.user_id AND u.new_name = c.new_name
  WHERE NOT EXISTS (
    SELECT 1 FROM "Site" o
    WHERE o.user_id = c.user_id
      AND o.project_name = c.new_name
      AND o.id <> c.id
  )
)
UPDATE "Site" s
SET project_name = e.new_name,
    config_json  = s.config_json - 'title'
FROM eligible e
WHERE s.id = e.id;
