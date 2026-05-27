/*
  Warnings:

  - You are about to drop the column `sync_error` on the `Blob` table. All the data in the column will be lost.
  - You are about to drop the column `sync_status` on the `Blob` table. All the data in the column will be lost.
  - You are about to drop the column `auto_sync` on the `Site` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PublishSource" AS ENUM ('github_webhook', 'cli', 'obsidian_plugin', 'dashboard_upload');

-- CreateEnum
CREATE TYPE "PublishFileChangeType" AS ENUM ('added', 'updated', 'deleted');

-- CreateEnum
CREATE TYPE "PublishFileStatus" AS ENUM ('uploading', 'success', 'error');

-- AlterTable
ALTER TABLE "Blob" DROP COLUMN "sync_error",
DROP COLUMN "sync_status",
ALTER COLUMN "metadata" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "auto_sync";

-- DropEnum
DROP TYPE "Status";

-- CreateTable
CREATE TABLE "Publish" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "source" "PublishSource" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "git_commit_sha" TEXT,
    "git_commit_message" TEXT,

    CONSTRAINT "Publish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishFile" (
    "id" TEXT NOT NULL,
    "publish_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "change_type" "PublishFileChangeType" NOT NULL,
    "status" "PublishFileStatus" NOT NULL DEFAULT 'uploading',
    "error" TEXT,
    "presigned_url_expires_at" TIMESTAMP(3),

    CONSTRAINT "PublishFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Publish_site_id_started_at_idx" ON "Publish"("site_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "PublishFile_publish_id_status_idx" ON "PublishFile"("publish_id", "status");

-- AddForeignKey
ALTER TABLE "Publish" ADD CONSTRAINT "Publish_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishFile" ADD CONSTRAINT "PublishFile_publish_id_fkey" FOREIGN KEY ("publish_id") REFERENCES "Publish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
