/*
  Warnings:

  - A unique constraint covering the columns `[priorityName]` on the table `TaskPriority` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[statusName]` on the table `TaskStatus` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TaskPriority_priorityName_key" ON "public"."TaskPriority"("priorityName");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStatus_statusName_key" ON "public"."TaskStatus"("statusName");
