/*
  Warnings:

  - You are about to drop the column `taskCommentId` on the `TaskLink` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TaskLink" DROP CONSTRAINT "TaskLink_taskCommentId_fkey";

-- AlterTable
ALTER TABLE "TaskLink" DROP COLUMN "taskCommentId";

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_sourceCommentId_fkey" FOREIGN KEY ("sourceCommentId") REFERENCES "TaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
