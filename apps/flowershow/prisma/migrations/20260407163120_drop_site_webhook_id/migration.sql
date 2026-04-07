/*
  Warnings:

  - You are about to drop the column `webhook_id` on the `Site` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Site_webhook_id_key";

-- AlterTable
ALTER TABLE "Site" DROP COLUMN "webhook_id";
