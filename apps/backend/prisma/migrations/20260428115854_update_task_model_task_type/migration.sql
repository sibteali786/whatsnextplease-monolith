-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "type" "TaskType";
