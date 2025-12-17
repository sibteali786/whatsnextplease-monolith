-- CreateIndex
CREATE INDEX "Task_statusId_priorityId_idx" ON "Task"("statusId", "priorityId");

-- CreateIndex
CREATE INDEX "Task_taskCategoryId_assignedToId_idx" ON "Task"("taskCategoryId", "assignedToId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_statusId_idx" ON "Task"("assignedToId", "statusId");

-- CreateIndex
CREATE INDEX "Task_dueDate_statusId_idx" ON "Task"("dueDate", "statusId");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");
