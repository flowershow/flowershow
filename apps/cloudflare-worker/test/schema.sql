-- Generated from apps/flowershow/prisma/schema.prisma
-- Regenerate with: npm run generate:test-schema
-- DO NOT EDIT MANUALLY

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PublishSource" AS ENUM ('github_webhook', 'cli', 'obsidian_plugin', 'dashboard_upload');

-- CreateEnum
CREATE TYPE "PublishFileChangeType" AS ENUM ('added', 'updated', 'deleted');

-- CreateEnum
CREATE TYPE "PublishFileStatus" AS ENUM ('uploading', 'success', 'error', 'canceled');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused');

-- CreateEnum
CREATE TYPE "PrivacyMode" AS ENUM ('PUBLIC', 'PASSWORD');

-- CreateEnum
CREATE TYPE "SyntaxMode" AS ENUM ('md', 'mdx', 'auto');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('CLI', 'PAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "gh_username" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "discord_id" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "feedback" JSONB,
    "cancel_bonus_granted_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "interval" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "refresh_token_expires_in" INTEGER,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "gh_repository" TEXT,
    "gh_branch" TEXT,
    "subdomain" TEXT NOT NULL,
    "custom_domain" TEXT,
    "root_dir" TEXT,
    "project_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "enable_comments" BOOLEAN NOT NULL DEFAULT false,
    "giscus_repo_id" TEXT,
    "giscus_category_id" TEXT,
    "enable_search" BOOLEAN NOT NULL DEFAULT false,
    "enable_rss" BOOLEAN NOT NULL DEFAULT false,
    "show_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "tree" JSONB,
    "privacy_mode" "PrivacyMode" NOT NULL DEFAULT 'PUBLIC',
    "access_password_hash" TEXT,
    "access_password_updated_at" TIMESTAMP(3),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "syntax_mode" "SyntaxMode" NOT NULL DEFAULT 'auto',
    "show_built_with_button" BOOLEAN NOT NULL DEFAULT true,
    "show_raw_link" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB DEFAULT '{}',
    "is_temporary" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "anonymous_owner_id" TEXT,
    "installation_repository_id" TEXT,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blob" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "app_path" TEXT,
    "permalink" TEXT,
    "size" INTEGER NOT NULL,
    "sha" TEXT NOT NULL,
    "metadata" JSONB,
    "extension" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publish" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "source" "PublishSource" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "git_commit_sha" TEXT,
    "git_commit_message" TEXT,
    "legacy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Publish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishFile" (
    "id" TEXT NOT NULL,
    "publish_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "change_type" "PublishFileChangeType" NOT NULL,
    "status" "PublishFileStatus" NOT NULL DEFAULT 'uploading',
    "error" TEXT,
    "presigned_url_expires_at" TIMESTAMP(3),

    CONSTRAINT "PublishFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCode" (
    "id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 5,
    "user_id" TEXT,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "authorized_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "type" "TokenType" NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_discord_id_key" ON "User"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_site_id_key" ON "Subscription"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripe_customer_id_key" ON "Subscription"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripe_subscription_id_key" ON "Subscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "Subscription_site_id_idx" ON "Subscription"("site_id");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Site_subdomain_key" ON "Site"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Site_custom_domain_key" ON "Site"("custom_domain");

-- CreateIndex
CREATE INDEX "Site_user_id_idx" ON "Site"("user_id");

-- CreateIndex
CREATE INDEX "Site_installation_repository_id_idx" ON "Site"("installation_repository_id");

-- CreateIndex
CREATE INDEX "Site_expires_at_idx" ON "Site"("expires_at");

-- CreateIndex
CREATE INDEX "Site_anonymous_owner_id_idx" ON "Site"("anonymous_owner_id");

-- CreateIndex
CREATE INDEX "Blob_site_id_idx" ON "Blob"("site_id");

-- CreateIndex
CREATE INDEX "Blob_site_id_permalink_idx" ON "Blob"("site_id", "permalink");

-- CreateIndex
CREATE UNIQUE INDEX "Blob_site_id_path_key" ON "Blob"("site_id", "path");

-- CreateIndex
CREATE INDEX "Publish_site_id_started_at_idx" ON "Publish"("site_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "PublishFile_publish_id_status_idx" ON "PublishFile"("publish_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCode_device_code_key" ON "DeviceCode"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCode_user_code_key" ON "DeviceCode"("user_code");

-- CreateIndex
CREATE INDEX "DeviceCode_device_code_idx" ON "DeviceCode"("device_code");

-- CreateIndex
CREATE INDEX "DeviceCode_user_code_idx" ON "DeviceCode"("user_code");

-- CreateIndex
CREATE INDEX "DeviceCode_expires_at_idx" ON "DeviceCode"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_token_key" ON "AccessToken"("token");

-- CreateIndex
CREATE INDEX "AccessToken_user_id_idx" ON "AccessToken"("user_id");

-- CreateIndex
CREATE INDEX "AccessToken_token_idx" ON "AccessToken"("token");

-- CreateIndex
CREATE INDEX "GitHubInstallation_user_id_idx" ON "GitHubInstallation"("user_id");

-- CreateIndex
CREATE INDEX "GitHubInstallation_installation_id_idx" ON "GitHubInstallation"("installation_id");

-- CreateIndex
CREATE INDEX "GitHubInstallation_account_id_idx" ON "GitHubInstallation"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_installation_id_user_id_key" ON "GitHubInstallation"("installation_id", "user_id");

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_installation_id_idx" ON "GitHubInstallationRepository"("installation_id");

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_repository_full_name_idx" ON "GitHubInstallationRepository"("repository_full_name");

-- CreateIndex
CREATE INDEX "GitHubInstallationRepository_repository_id_idx" ON "GitHubInstallationRepository"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallationRepository_installation_id_repository_id_key" ON "GitHubInstallationRepository"("installation_id", "repository_id");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_installation_repository_id_fkey" FOREIGN KEY ("installation_repository_id") REFERENCES "GitHubInstallationRepository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blob" ADD CONSTRAINT "Blob_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publish" ADD CONSTRAINT "Publish_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishFile" ADD CONSTRAINT "PublishFile_publish_id_fkey" FOREIGN KEY ("publish_id") REFERENCES "Publish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCode" ADD CONSTRAINT "DeviceCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubInstallationRepository" ADD CONSTRAINT "GitHubInstallationRepository_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "GitHubInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

