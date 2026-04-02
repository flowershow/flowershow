-- Re-sanitize all subdomains to conform to DNS label rules:
--   lowercase, only a-z/0-9/-, collapse consecutive hyphens,
--   strip leading/trailing hyphens, max 63 chars.
-- Collisions are resolved by appending -2, -3, … to the base value.
DO $$
DECLARE
  rec        RECORD;
  base_sub   TEXT;
  candidate  TEXT;
  suffix_int INT;
  suffix_str TEXT;
BEGIN

  -- Regular user sites
  FOR rec IN
    SELECT s.id, s.project_name, s.subdomain, u.username
    FROM "Site" s
    JOIN "User" u ON u.id = s.user_id
    WHERE s.user_id != 'anon000000000000000000000000'
    ORDER BY s.id  -- deterministic order so collisions are resolved consistently
  LOOP
    base_sub := LEFT(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          REGEXP_REPLACE(LOWER(rec.project_name || '-' || rec.username), '[^a-z0-9-]', '-', 'g'),
          '-+', '-', 'g'
        )
      ),
      63
    );

    IF base_sub = rec.subdomain THEN
      CONTINUE;  -- already correct, nothing to do
    END IF;

    candidate  := base_sub;
    suffix_int := 2;
    WHILE EXISTS (
      SELECT 1 FROM "Site" WHERE subdomain = candidate AND id != rec.id
    ) LOOP
      suffix_str := '-' || suffix_int::text;
      candidate  := LEFT(base_sub, 63 - LENGTH(suffix_str)) || suffix_str;
      suffix_int := suffix_int + 1;
    END LOOP;

    UPDATE "Site" SET subdomain = candidate WHERE id = rec.id;
  END LOOP;

  -- Anonymous / temporary sites
  FOR rec IN
    SELECT id, project_name, subdomain
    FROM "Site"
    WHERE user_id = 'anon000000000000000000000000'
    ORDER BY id
  LOOP
    base_sub := LEFT(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          REGEXP_REPLACE(LOWER(rec.project_name || '-anon'), '[^a-z0-9-]', '-', 'g'),
          '-+', '-', 'g'
        )
      ),
      63
    );

    IF base_sub = rec.subdomain THEN
      CONTINUE;
    END IF;

    candidate  := base_sub;
    suffix_int := 2;
    WHILE EXISTS (
      SELECT 1 FROM "Site" WHERE subdomain = candidate AND id != rec.id
    ) LOOP
      suffix_str := '-' || suffix_int::text;
      candidate  := LEFT(base_sub, 63 - LENGTH(suffix_str)) || suffix_str;
      suffix_int := suffix_int + 1;
    END LOOP;

    UPDATE "Site" SET subdomain = candidate WHERE id = rec.id;
  END LOOP;

END;
$$;
