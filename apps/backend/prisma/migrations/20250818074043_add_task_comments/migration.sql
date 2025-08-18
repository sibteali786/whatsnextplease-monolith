-- CreateTable
CREATE TABLE "public"."TaskComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorClientId" TEXT,
    "authorType" "public"."CreatorType" NOT NULL,
    "parentCommentId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "mentionedUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaskCommentFile" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "TaskCommentFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "public"."TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskComment_parentCommentId_idx" ON "public"."TaskComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "public"."TaskComment"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCommentFile_commentId_fileId_key" ON "public"."TaskCommentFile"("commentId", "fileId");

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_authorClientId_fkey" FOREIGN KEY ("authorClientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskComment" ADD CONSTRAINT "TaskComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."TaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskCommentFile" ADD CONSTRAINT "TaskCommentFile_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskCommentFile" ADD CONSTRAINT "TaskCommentFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
