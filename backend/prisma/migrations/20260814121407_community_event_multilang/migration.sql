/*
  Warnings:

  - You are about to drop the column `message` on the `CommunityEvent` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CommunityEvent" DROP COLUMN "message",
ADD COLUMN     "params" JSONB,
ADD COLUMN     "templateIndex" INTEGER;
