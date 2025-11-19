/*
  Warnings:

  - Added the required column `aiMessageChildIds` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aiMessages` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `messageIdCounter` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userMessageChildIds` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Chat" ADD COLUMN     "aiMessageChildIds" JSONB NOT NULL,
ADD COLUMN     "aiMessages" JSONB NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "messageIdCounter" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userMessageChildIds" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "public"."UserMessage" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'user',
    "parts" JSONB NOT NULL,
    "createdAt" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "UserMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."UserMessage" ADD CONSTRAINT "UserMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
