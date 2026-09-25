-- CreateEnum
CREATE TYPE "TagSource" AS ENUM ('frontmatter', 'inline');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "blob_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "source" "TagSource" NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_site_id_identity_idx" ON "Tag"("site_id", "identity");

-- CreateIndex
CREATE INDEX "Tag_blob_id_idx" ON "Tag"("blob_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_blob_id_identity_key" ON "Tag"("blob_id", "identity");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_blob_id_fkey" FOREIGN KEY ("blob_id") REFERENCES "Blob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
