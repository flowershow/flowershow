-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "custom_domain_live_at" TIMESTAMP(3);

-- Existing custom domains have always been redirected to; keep doing so.
UPDATE "Site" SET "custom_domain_live_at" = CURRENT_TIMESTAMP WHERE "custom_domain" IS NOT NULL;
