-- Add anonymous to PublishSource enum
ALTER TYPE "PublishSource" ADD VALUE 'anonymous';

-- Add expired to PublishFileStatus enum
ALTER TYPE "PublishFileStatus" ADD VALUE 'expired';

-- Create PublishStatus enum
CREATE TYPE "PublishStatus" AS ENUM ('in_progress', 'finalizing', 'success', 'error', 'superseded');

-- Add status column (default in_progress for new rows)
ALTER TABLE "Publish" ADD COLUMN "status" "PublishStatus" NOT NULL DEFAULT 'in_progress';

-- Backfill existing rows as success (all historical, pre-lifecycle tracking)
UPDATE "Publish" SET "status" = 'success';

-- Add completed_at column
ALTER TABLE "Publish" ADD COLUMN "completed_at" TIMESTAMP(3);

-- Backfill completed_at for historical rows
UPDATE "Publish" SET "completed_at" = "started_at" WHERE "status" = 'success';
