/*
  Warnings:

  - The values [URGENT,LOW_PRIORITY,NORMAL] on the enum `TaskPriorityEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TaskPriorityEnum_new" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'HOLD');
ALTER TABLE "TaskPriority" ALTER COLUMN "priorityName" DROP DEFAULT;
ALTER TABLE "TaskPriority" ALTER COLUMN "priorityName" TYPE "TaskPriorityEnum_new" USING ("priorityName"::text::"TaskPriorityEnum_new");
ALTER TYPE "TaskPriorityEnum" RENAME TO "TaskPriorityEnum_old";
ALTER TYPE "TaskPriorityEnum_new" RENAME TO "TaskPriorityEnum";
DROP TYPE "TaskPriorityEnum_old";
ALTER TABLE "TaskPriority" ALTER COLUMN "priorityName" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterTable
ALTER TABLE "TaskPriority" ALTER COLUMN "priorityName" SET DEFAULT 'MEDIUM';
