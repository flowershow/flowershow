-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('CLI', 'PAT');

-- AlterTable
ALTER TABLE "CliToken" ADD COLUMN "type" "TokenType";

-- Set existing tokens to CLI
UPDATE "CliToken" SET "type" = 'CLI';

-- Make column required
ALTER TABLE "CliToken" ALTER COLUMN "type" SET NOT NULL;
