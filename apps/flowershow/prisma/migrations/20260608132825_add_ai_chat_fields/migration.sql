-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "ai_chat_api_key" TEXT,
ADD COLUMN     "enable_ai_chat" BOOLEAN NOT NULL DEFAULT false;
