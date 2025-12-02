-- CreateEnum
CREATE TYPE "PrivacyMode" AS ENUM ('PUBLIC', 'PASSWORD');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "access_password_hash" TEXT,
ADD COLUMN     "access_password_updated_at" TIMESTAMP(3),
ADD COLUMN     "privacy_mode" "PrivacyMode" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
