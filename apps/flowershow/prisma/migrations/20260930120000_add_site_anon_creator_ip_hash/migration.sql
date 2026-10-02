-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "anon_creator_ip_hash" TEXT;

-- CreateIndex
CREATE INDEX "Site_anon_creator_ip_hash_created_at_idx" ON "Site"("anon_creator_ip_hash", "created_at");
