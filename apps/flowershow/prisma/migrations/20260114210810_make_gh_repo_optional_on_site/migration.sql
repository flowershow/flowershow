-- DropIndex
DROP INDEX "Site_user_id_project_name_key";

-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "gh_repository" DROP NOT NULL,
ALTER COLUMN "gh_branch" DROP NOT NULL;
