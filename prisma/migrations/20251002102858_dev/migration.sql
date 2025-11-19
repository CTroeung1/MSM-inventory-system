/*
  Warnings:

  - You are about to drop the `UserMessage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userMessages` to the `Chat` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."UserMessage" DROP CONSTRAINT "UserMessage_chatId_fkey";

-- AlterTable
ALTER TABLE "public"."Chat" ADD COLUMN     "userMessages" JSONB NOT NULL,
ALTER COLUMN "messageIdCounter" SET DEFAULT 1;

-- DropTable
DROP TABLE "public"."UserMessage";
