-- CreateEnum
CREATE TYPE "SyntaxMode" AS ENUM ('md', 'mdx', 'auto');

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "syntax_mode" "SyntaxMode" NOT NULL DEFAULT 'auto';

-- Update existing sites to use 'mdx' instead of 'auto'
UPDATE "Site" SET "syntax_mode" = 'mdx' WHERE "syntax_mode" = 'auto';
