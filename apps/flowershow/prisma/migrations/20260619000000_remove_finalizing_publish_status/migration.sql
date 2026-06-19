-- Migrate any lingering 'finalizing' rows to 'error' before removing the enum value
UPDATE "Publish" SET status = 'error' WHERE status = 'finalizing';

-- PostgreSQL does not support removing enum values in-place.
-- Recreate the type without 'finalizing' and update the column.
CREATE TYPE "PublishStatus_new" AS ENUM ('in_progress', 'success', 'error', 'superseded');

ALTER TABLE "Publish"
  ALTER COLUMN status TYPE "PublishStatus_new"
  USING status::text::"PublishStatus_new";

DROP TYPE "PublishStatus";

ALTER TYPE "PublishStatus_new" RENAME TO "PublishStatus";
