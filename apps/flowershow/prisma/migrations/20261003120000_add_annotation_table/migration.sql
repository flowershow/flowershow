-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "exact" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "suffix" TEXT NOT NULL DEFAULT '',
    "start_offset" INTEGER NOT NULL,
    "end_offset" INTEGER NOT NULL,
    "blob_sha" TEXT NOT NULL,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "note" TEXT NOT NULL,
    "author_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_site_id_path_idx" ON "Annotation"("site_id", "path");

-- CreateIndex
CREATE INDEX "Annotation_site_id_status_idx" ON "Annotation"("site_id", "status");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
