/*
  Warnings:

  - The `priorityName` column on the `TaskPriority` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TaskPriorityEnum" AS ENUM ('URGENT', 'LOW_PRIORITY', 'NORMAL');

-- AlterTable
ALTER TABLE "TaskPriority" DROP COLUMN "priorityName",
ADD COLUMN     "priorityName" "TaskPriorityEnum" NOT NULL DEFAULT 'NORMAL';
