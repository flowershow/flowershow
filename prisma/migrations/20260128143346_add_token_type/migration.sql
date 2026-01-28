-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('CLI', 'PAT');

-- AlterTable
ALTER TABLE "CliToken" ADD COLUMN "type" "TokenType" NOT NULL;
