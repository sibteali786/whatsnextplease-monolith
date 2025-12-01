/*
  Warnings:

  - A unique constraint covering the columns `[serialNumber]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[prefix]` on the table `TaskCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "serialNumber" TEXT;

-- AlterTable
ALTER TABLE "TaskCategory" ADD COLUMN     "prefix" TEXT;

-- CreateTable
CREATE TABLE "TaskSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "currentNumber" BIGINT NOT NULL DEFAULT 0,
    "taskCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskSequence_prefix_key" ON "TaskSequence"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSequence_taskCategoryId_key" ON "TaskSequence"("taskCategoryId");

-- CreateIndex
CREATE INDEX "TaskSequence_prefix_idx" ON "TaskSequence"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "Task_serialNumber_key" ON "Task"("serialNumber");

-- CreateIndex
CREATE INDEX "Task_serialNumber_idx" ON "Task"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_prefix_key" ON "TaskCategory"("prefix");

-- AddForeignKey
ALTER TABLE "TaskSequence" ADD CONSTRAINT "TaskSequence_taskCategoryId_fkey" FOREIGN KEY ("taskCategoryId") REFERENCES "TaskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
