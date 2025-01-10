/*
  Warnings:

  - The `statusName` column on the `TaskStatus` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TaskStatusEnum" AS ENUM ('NEW', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "TaskStatus" DROP COLUMN "statusName",
ADD COLUMN     "statusName" "TaskStatusEnum" NOT NULL DEFAULT 'NEW';
