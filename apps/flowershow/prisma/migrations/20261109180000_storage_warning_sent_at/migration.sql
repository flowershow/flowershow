-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "storage_warning_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "storage_pool_warning_sent_at" TIMESTAMP(3);
