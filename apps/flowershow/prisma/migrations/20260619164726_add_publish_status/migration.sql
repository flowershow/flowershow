-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('in_progress', 'success', 'error', 'superseded');

-- AlterEnum
ALTER TYPE "PublishFileStatus" ADD VALUE 'expired';

-- AlterEnum
ALTER TYPE "PublishSource" ADD VALUE 'anonymous';

-- AlterTable
ALTER TABLE "Publish" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "status" "PublishStatus" NOT NULL DEFAULT 'in_progress';
