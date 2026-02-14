-- AlterTable
ALTER TABLE "Blob" ADD COLUMN     "permalink" TEXT;

-- CreateIndex
CREATE INDEX "Blob_site_id_permalink_idx" ON "Blob"("site_id", "permalink");
