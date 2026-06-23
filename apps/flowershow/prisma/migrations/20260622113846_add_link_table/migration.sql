-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('wikilink', 'embed', 'commonmark');

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "source_blob_id" TEXT NOT NULL,
    "target_path" TEXT NOT NULL,
    "target_blob_id" TEXT,
    "link_type" "LinkType" NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Link_site_id_idx" ON "Link"("site_id");

-- CreateIndex
CREATE INDEX "Link_target_blob_id_idx" ON "Link"("target_blob_id");

-- CreateIndex
CREATE UNIQUE INDEX "Link_source_blob_id_target_path_key" ON "Link"("source_blob_id", "target_path");

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_source_blob_id_fkey" FOREIGN KEY ("source_blob_id") REFERENCES "Blob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_target_blob_id_fkey" FOREIGN KEY ("target_blob_id") REFERENCES "Blob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
