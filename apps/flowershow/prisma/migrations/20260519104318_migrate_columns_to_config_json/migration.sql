-- Migrate existing sites to fully-hydrated config_json in three layers
-- (right side wins on key conflicts for each || operator):
--   1. Code defaults  →  ensures every site has explicit values for all known fields
--   2. Old columns    →  preserves any setting the user had before the unified config
--   3. Existing configJson  →  preserves any value already explicitly set via the dashboard
UPDATE "Site"
SET "config_json" =
  -- 1. Base defaults (mirrors SITE_CONFIG_DEFAULTS in lib/site-config.ts)
  '{"showToc":true,"showSidebar":true,"showComments":false,"enableSearch":false,"enableRss":false,"showBuiltWithButton":true,"showRawLink":false,"showEditLink":false,"syntaxMode":"auto"}'::jsonb
  -- 2. Old dedicated columns (to be dropped in a future migration)
  || jsonb_strip_nulls(jsonb_build_object(
    'showComments',        "enable_comments",
    'enableSearch',        "enable_search",
    'enableRss',           "enable_rss",
    'showSidebar',         "show_sidebar",
    'showBuiltWithButton', "show_built_with_button",
    'showRawLink',         "show_raw_link",
    'syntaxMode',          "syntax_mode"::text,
    'giscus', CASE
      WHEN "giscus_repo_id" IS NOT NULL OR "giscus_category_id" IS NOT NULL
      THEN jsonb_strip_nulls(jsonb_build_object(
        'repoId',     "giscus_repo_id",
        'categoryId', "giscus_category_id"
      ))
      ELSE NULL
    END
  ))
;
