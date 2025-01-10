/*
  Warnings:

  - You are about to drop the column `clientId` on the `Task` table. All the data in the column will be lost.
  - Added the required column `createdByType` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeForTask` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CreatorType" AS ENUM ('USER', 'CLIENT');

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_clientId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "clientId",
ADD COLUMN     "createdByType" "CreatorType" NOT NULL,
ADD COLUMN     "overTime" DECIMAL(10,2),
ADD COLUMN     "timeForTask" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "TaskFile" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "TaskFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskFile_taskId_fileId_key" ON "TaskFile"("taskId", "fileId");

-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "Task_createdById_fkey" TO "fk_createdByUser";

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "fk_createdByClient" FOREIGN KEY ("createdById") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFile" ADD CONSTRAINT "TaskFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskFile" ADD CONSTRAINT "TaskFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
