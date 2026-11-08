-- CreateEnum
CREATE TYPE "SiteMemberRole" AS ENUM ('EDITOR');

-- AlterTable
ALTER TABLE "Publish" ADD COLUMN "user_id" TEXT;

-- CreateTable
CREATE TABLE "SiteMember" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SiteMemberRole" NOT NULL DEFAULT 'EDITOR',
    "invited_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInvite" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SiteMemberRole" NOT NULL DEFAULT 'EDITOR',
    "token_hash" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteMember_user_id_idx" ON "SiteMember"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMember_site_id_user_id_key" ON "SiteMember"("site_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInvite_token_hash_key" ON "SiteInvite"("token_hash");

-- CreateIndex
CREATE INDEX "SiteInvite_email_idx" ON "SiteInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInvite_site_id_email_key" ON "SiteInvite"("site_id", "email");

-- AddForeignKey
ALTER TABLE "Publish" ADD CONSTRAINT "Publish_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMember" ADD CONSTRAINT "SiteMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInvite" ADD CONSTRAINT "SiteInvite_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
