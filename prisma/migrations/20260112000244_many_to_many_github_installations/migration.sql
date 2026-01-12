/*
  Warnings:

  - A unique constraint covering the columns `[installation_id,user_id]` on the table `GitHubInstallation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "GitHubInstallation_installation_id_key";

-- CreateIndex
CREATE INDEX "GitHubInstallation_account_id_idx" ON "GitHubInstallation"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_installation_id_user_id_key" ON "GitHubInstallation"("installation_id", "user_id");
