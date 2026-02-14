-- Rename table from CliToken to AccessToken
ALTER TABLE "CliToken" RENAME TO "AccessToken";

-- Rename indexes
ALTER INDEX "CliToken_pkey" RENAME TO "AccessToken_pkey";
ALTER INDEX "CliToken_token_key" RENAME TO "AccessToken_token_key";
ALTER INDEX "CliToken_user_id_idx" RENAME TO "AccessToken_user_id_idx";
ALTER INDEX "CliToken_token_idx" RENAME TO "AccessToken_token_idx";

-- Rename foreign key constraint
ALTER TABLE "AccessToken" RENAME CONSTRAINT "CliToken_user_id_fkey" TO "AccessToken_user_id_fkey";
