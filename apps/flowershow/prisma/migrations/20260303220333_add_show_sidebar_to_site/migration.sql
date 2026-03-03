-- Add show_sidebar column with default true (for new sites going forward)
ALTER TABLE "Site" ADD COLUMN "show_sidebar" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: set all existing sites to false (preserves current behavior)
-- A separate script will flip sites that had showSidebar: true in their config.json
UPDATE "Site" SET "show_sidebar" = false;
