-- Copy existing Site column values into config_json JSONB.
-- Right side (existing config_json) wins on key conflicts, preserving any values
-- already explicitly set via the dashboard.
UPDATE "Site"
SET "config_json" =
  jsonb_strip_nulls(jsonb_build_object(
    'enableComments',      "enable_comments",
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
  )) || COALESCE("config_json", '{}')::jsonb;
