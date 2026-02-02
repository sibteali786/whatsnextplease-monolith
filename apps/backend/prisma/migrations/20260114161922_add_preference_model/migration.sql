-- CreateEnum
CREATE TYPE "SortDirection" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "TaskSortField" AS ENUM ('START_DATE', 'END_DATE', 'PRIORITY');

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskViewFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferenceId" TEXT NOT NULL,
    "taskCategoryId" TEXT,
    "status" "TaskStatusEnum",
    "assignedToId" TEXT,
    "clientId" TEXT,
    "sortField" "TaskSortField",
    "sortDirection" "SortDirection",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskViewFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_clientId_key" ON "Preference"("clientId");

-- CreateIndex
CREATE INDEX "TaskViewFilter_preferenceId_idx" ON "TaskViewFilter"("preferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskViewFilter_preferenceId_name_key" ON "TaskViewFilter"("preferenceId", "name");

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskViewFilter" ADD CONSTRAINT "TaskViewFilter_preferenceId_fkey" FOREIGN KEY ("preferenceId") REFERENCES "Preference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
