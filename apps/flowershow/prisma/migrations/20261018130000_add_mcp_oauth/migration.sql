-- CreateEnum
CREATE TYPE "OAuthClientKind" AS ENUM ('DCR', 'CIMD');

-- CreateEnum
CREATE TYPE "OAuthTokenKind" AS ENUM ('ACCESS', 'REFRESH');

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "kind" "OAuthClientKind" NOT NULL,
    "name" TEXT NOT NULL,
    "uri" TEXT,
    "logo_uri" TEXT,
    "redirect_uris" TEXT[],
    "metadata_fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthGrant" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "OAuthGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthPendingRequest" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthPendingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizationCode" (
    "code_hash" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizationCode_pkey" PRIMARY KEY ("code_hash")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "token_hash" TEXT NOT NULL,
    "grant_id" TEXT NOT NULL,
    "kind" "OAuthTokenKind" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "OAuthRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_client_id_key" ON "OAuthClient"("client_id");

-- CreateIndex
CREATE INDEX "OAuthGrant_user_id_idx" ON "OAuthGrant"("user_id");

-- CreateIndex
CREATE INDEX "OAuthGrant_client_id_idx" ON "OAuthGrant"("client_id");

-- CreateIndex
CREATE INDEX "OAuthPendingRequest_expires_at_idx" ON "OAuthPendingRequest"("expires_at");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_grant_id_idx" ON "OAuthAuthorizationCode"("grant_id");

-- CreateIndex
CREATE INDEX "OAuthAuthorizationCode_expires_at_idx" ON "OAuthAuthorizationCode"("expires_at");

-- CreateIndex
CREATE INDEX "OAuthToken_grant_id_idx" ON "OAuthToken"("grant_id");

-- CreateIndex
CREATE INDEX "OAuthToken_expires_at_idx" ON "OAuthToken"("expires_at");

-- CreateIndex
CREATE INDEX "OAuthRateLimit_expires_at_idx" ON "OAuthRateLimit"("expires_at");

-- AddForeignKey
ALTER TABLE "OAuthGrant" ADD CONSTRAINT "OAuthGrant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthGrant" ADD CONSTRAINT "OAuthGrant_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthAuthorizationCode" ADD CONSTRAINT "OAuthAuthorizationCode_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "OAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "OAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

