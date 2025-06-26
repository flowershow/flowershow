/*
  Warnings:

  - A unique constraint covering the columns `[site_id,path]` on the table `Blob` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id,app_path]` on the table `Blob` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[custom_domain]` on the table `Site` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[webhook_id]` on the table `Site` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,project_name]` on the table `Site` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[site_id]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_customer_id]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
*/
-- DropForeignKey
ALTER TABLE "Blob" DROP CONSTRAINT "Blob_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_siteId_fkey";

-- DropIndex
DROP INDEX "Blob_appPath_idx";

-- DropIndex
DROP INDEX "Blob_siteId_appPath_key";

-- DropIndex
DROP INDEX "Blob_siteId_idx";

-- DropIndex
DROP INDEX "Blob_siteId_path_key";

-- DropIndex
DROP INDEX "Site_customDomain_key";

-- DropIndex
DROP INDEX "Site_userId_idx";

-- DropIndex
DROP INDEX "Site_userId_projectName_key";

-- DropIndex
DROP INDEX "Site_webhookId_key";

-- DropIndex
DROP INDEX "Subscription_siteId_idx";

-- DropIndex
DROP INDEX "Subscription_siteId_key";

-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Subscription_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "Blob" RENAME COLUMN "appPath" TO "app_path";
ALTER TABLE "Blob" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Blob" RENAME COLUMN "siteId" TO "site_id";
ALTER TABLE "Blob" RENAME COLUMN "syncError" TO "sync_error";
ALTER TABLE "Blob" RENAME COLUMN "syncStatus" TO "sync_status";
ALTER TABLE "Blob" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "Site" RENAME COLUMN "autoSync" TO "auto_sync";
ALTER TABLE "Site" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Site" RENAME COLUMN "customDomain" TO "custom_domain";
ALTER TABLE "Site" RENAME COLUMN "enableComments" TO "enable_comments";
ALTER TABLE "Site" RENAME COLUMN "enableSearch" TO "enable_search";
ALTER TABLE "Site" RENAME COLUMN "giscusCategoryId" TO "giscus_category_id";
ALTER TABLE "Site" RENAME COLUMN "giscusRepoId" TO "giscus_repo_id";
ALTER TABLE "Site" RENAME COLUMN "projectName" TO "project_name";
ALTER TABLE "Site" RENAME COLUMN "rootDir" TO "root_dir";
ALTER TABLE "Site" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Site" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "Site" RENAME COLUMN "webhookId" TO "webhook_id";

-- AlterTable
ALTER TABLE "Subscription" RENAME COLUMN "cancelAtPeriodEnd" TO "cancel_at_period_end";
ALTER TABLE "Subscription" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Subscription" RENAME COLUMN "currentPeriodEnd" TO "current_period_end";
ALTER TABLE "Subscription" RENAME COLUMN "currentPeriodStart" TO "current_period_start";
ALTER TABLE "Subscription" RENAME COLUMN "siteId" TO "site_id";
ALTER TABLE "Subscription" RENAME COLUMN "stripeCustomerId" TO "stripe_customer_id";
ALTER TABLE "Subscription" RENAME COLUMN "stripePriceId" TO "stripe_price_id";
ALTER TABLE "Subscription" RENAME COLUMN "stripeSubscriptionId" TO "stripe_subscription_id";
ALTER TABLE "Subscription" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable
ALTER TABLE "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "emailVerified" TO "email_verified";
ALTER TABLE "User" RENAME COLUMN "updatedAt" TO "updated_at";

-- CreateIndex
CREATE INDEX "Blob_site_id_idx" ON "Blob"("site_id");

-- CreateIndex
CREATE INDEX "Blob_app_path_idx" ON "Blob"("app_path");

-- CreateIndex
CREATE UNIQUE INDEX "Blob_site_id_path_key" ON "Blob"("site_id", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Blob_site_id_app_path_key" ON "Blob"("site_id", "app_path");

-- CreateIndex
CREATE UNIQUE INDEX "Site_custom_domain_key" ON "Site"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "Site_webhook_id_key" ON "Site"("webhook_id");

-- CreateIndex
CREATE INDEX "Site_user_id_idx" ON "Site"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Site_user_id_project_name_key" ON "Site"("user_id", "project_name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_site_id_key" ON "Subscription"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripe_customer_id_key" ON "Subscription"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripe_subscription_id_key" ON "Subscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_site_id_idx" ON "Subscription"("site_id");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blob" ADD CONSTRAINT "Blob_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
