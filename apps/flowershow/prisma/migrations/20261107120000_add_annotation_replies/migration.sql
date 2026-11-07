-- AlterTable
ALTER TABLE "Annotation" ADD COLUMN "resolved_by" TEXT;

-- CreateTable
CREATE TABLE "AnnotationReply" (
    "id" TEXT NOT NULL,
    "annotation_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "author_name" TEXT,
    "by_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnotationReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnotationReply_annotation_id_idx" ON "AnnotationReply"("annotation_id");

-- AddForeignKey
ALTER TABLE "AnnotationReply" ADD CONSTRAINT "AnnotationReply_annotation_id_fkey" FOREIGN KEY ("annotation_id") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
