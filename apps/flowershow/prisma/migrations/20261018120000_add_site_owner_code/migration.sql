-- CreateTable
CREATE TABLE "SiteOwnerCode" (
    "code_hash" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteOwnerCode_pkey" PRIMARY KEY ("code_hash")
);

-- CreateIndex
CREATE INDEX "SiteOwnerCode_expires_at_idx" ON "SiteOwnerCode"("expires_at");

-- AddForeignKey
ALTER TABLE "SiteOwnerCode" ADD CONSTRAINT "SiteOwnerCode_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
