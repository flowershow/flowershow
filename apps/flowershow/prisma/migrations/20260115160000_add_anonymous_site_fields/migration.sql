-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "anonymous_owner_id" TEXT,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_temporary" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Site_expires_at_idx" ON "Site"("expires_at");

-- CreateIndex
CREATE INDEX "Site_anonymous_owner_id_idx" ON "Site"("anonymous_owner_id");
