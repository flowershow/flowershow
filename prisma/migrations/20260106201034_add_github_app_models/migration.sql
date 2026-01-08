-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "installation_id" TEXT;

-- CreateTable
CREATE TABLE "GitHubInstallation" (
    "id" TEXT NOT NULL,
    "installation_id" BIGINT NOT NULL,
    "account_type" TEXT NOT NULL,
    "account_login" TEXT NOT NULL,
    "account_id" BIGINT NOT NULL,
    "user_id" TEXT NOT NULL,
    "suspended_at" TIMESTAMP(3),
    "suspended_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubInstallationRepository" (
    "id" TEXT NOT NULL,
    "installation_id" TEXT NOT NULL,
    "repository_id" BIGINT NOT NULL,
    "repository_name" TEXT NOT NULL,
    "repository_full_name" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubInstallationRepository_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_installation_id_key" ON "GitHubInstallation"("installation_id");

-- CreateIndex
CREATE INDEX "GitHubInstallation_user_id_idx" ON "GitHubInstallation"("user_id");

-- CreateIndex
CREATE INDEX "GitHubInstallation_installation_id_idx" ON "GitHubInstallation"("installation_id");

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_installation_id_idx" ON "GitHubInstallationRepository"("installation_id");

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_repository_full_name_idx" ON "GitHubInstallationRepository"("repository_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallationRepository_installation_id_repository_id_key" ON "GitHubInstallationRepository"("installation_id", "repository_id");

-- CreateIndex
CREATE INDEX "Site_installation_id_idx" ON "Site"("installation_id");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "GitHubInstallation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubInstallationRepository" ADD CONSTRAINT "GitHubInstallationRepository_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "GitHubInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
