-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "storage_allowance_bytes" BIGINT;

-- Grandfather Free sites already over the 200 MB hard limit: allowance is current usage + 10%.
UPDATE "Site" s
SET "storage_allowance_bytes" = CEIL(t.total * 1.1)::bigint
FROM (
  SELECT site_id, SUM(size)::bigint AS total
  FROM "Blob"
  GROUP BY site_id
) t
WHERE t.site_id = s.id
  AND s.plan = 'FREE'
  AND t.total > 209715200;
