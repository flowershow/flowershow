-- Add enable_rss column with default false (disabled by default)
ALTER TABLE "Site" ADD COLUMN "enable_rss" BOOLEAN NOT NULL DEFAULT false;
