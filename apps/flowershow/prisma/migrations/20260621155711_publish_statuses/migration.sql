-- AlterEnum
ALTER TYPE "PublishFileStatus" ADD VALUE 'expired';

-- AlterEnum
ALTER TYPE "PublishSource" ADD VALUE 'anonymous';

-- AlterTable
ALTER TABLE "Publish" ADD COLUMN     "completed_at" TIMESTAMP(3);
