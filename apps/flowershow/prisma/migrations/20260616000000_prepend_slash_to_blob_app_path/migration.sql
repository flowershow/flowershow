-- Prepend "/" to all blob.app_path values that don't already start with "/".
-- Root paths ("/") are unchanged; non-root paths gain a leading slash.
UPDATE "Blob"
SET app_path = '/' || app_path
WHERE app_path IS NOT NULL AND app_path NOT LIKE '/%';
