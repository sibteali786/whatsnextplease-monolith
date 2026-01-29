-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "latestTimeRemaining" INTEGER,
ADD COLUMN     "totalTimeSpent" INTEGER;

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorClientId" TEXT,
    "authorType" "CreatorType" NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "timeRemaining" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkLog_taskId_startedAt_idx" ON "WorkLog"("taskId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkLog_authorUserId_idx" ON "WorkLog"("authorUserId");

-- CreateIndex
CREATE INDEX "WorkLog_authorClientId_idx" ON "WorkLog"("authorClientId");

-- CreateIndex
CREATE INDEX "WorkLog_isDeleted_idx" ON "WorkLog"("isDeleted");

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_authorClientId_fkey" FOREIGN KEY ("authorClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
