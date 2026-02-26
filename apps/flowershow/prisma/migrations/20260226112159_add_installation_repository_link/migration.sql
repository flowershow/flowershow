-- AlterTable: add installation_repository_id FK, drop old installation_id
ALTER TABLE "Site" ADD COLUMN "installation_repository_id" TEXT;
ALTER TABLE "Site" DROP CONSTRAINT IF EXISTS "Site_installation_id_fkey";
DROP INDEX IF EXISTS "Site_installation_id_idx";
ALTER TABLE "Site" DROP COLUMN IF EXISTS "installation_id";

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_repository_id_idx" ON "GitHubInstallationRepository"("repository_id");

-- CreateIndex
CREATE INDEX "Site_installation_repository_id_idx" ON "Site"("installation_repository_id");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_installation_repository_id_fkey" FOREIGN KEY ("installation_repository_id") REFERENCES "GitHubInstallationRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
