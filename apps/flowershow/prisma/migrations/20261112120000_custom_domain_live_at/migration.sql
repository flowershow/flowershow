-- AlterTable
-- No backfill: a working custom domain is marked live on its next visit, and
-- one that doesn't work yet stops being redirected to.
ALTER TABLE "Site" ADD COLUMN     "custom_domain_live_at" TIMESTAMP(3);
