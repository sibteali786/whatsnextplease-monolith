-- CreateEnum
CREATE TYPE "LinkSource" AS ENUM ('MANUAL', 'COMMENT');

-- CreateTable
CREATE TABLE "TaskLink" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "faviconUrl" TEXT,
    "source" "LinkSource" NOT NULL DEFAULT 'MANUAL',
    "sourceCommentId" TEXT,
    "addedById" TEXT NOT NULL,
    "addedByType" "CreatorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskCommentId" TEXT,

    CONSTRAINT "TaskLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskLink_taskId_idx" ON "TaskLink"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLink_taskId_url_key" ON "TaskLink"("taskId", "url");

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskLink" ADD CONSTRAINT "TaskLink_taskCommentId_fkey" FOREIGN KEY ("taskCommentId") REFERENCES "TaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
