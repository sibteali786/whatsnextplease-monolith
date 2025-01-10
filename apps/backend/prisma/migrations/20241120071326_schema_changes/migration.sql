/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "action" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "roleId" TEXT,
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "companyName" SET DATA TYPE TEXT,
ALTER COLUMN "contactName" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "website" SET DATA TYPE TEXT,
ALTER COLUMN "address1" SET DATA TYPE TEXT,
ALTER COLUMN "address2" SET DATA TYPE TEXT,
ALTER COLUMN "city" SET DATA TYPE TEXT,
ALTER COLUMN "state" SET DATA TYPE TEXT,
ALTER COLUMN "zipCode" SET DATA TYPE TEXT,
ALTER COLUMN "avatarUrl" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "District" ALTER COLUMN "districtName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "File" ALTER COLUMN "fileName" SET DATA TYPE TEXT,
ALTER COLUMN "filePath" SET DATA TYPE TEXT,
ALTER COLUMN "uploadedBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FileCategory" ALTER COLUMN "categoryName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "MessageThread" ALTER COLUMN "subject" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "message" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Picklist" ALTER COLUMN "picklistName" SET DATA TYPE TEXT,
ALTER COLUMN "value" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "description" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Skill" ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "description" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SkillCategory" ALTER COLUMN "categoryName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "title" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TaskCategory" ALTER COLUMN "categoryName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TaskOffering" ALTER COLUMN "description" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TaskPriority" ALTER COLUMN "priorityName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Territory" ALTER COLUMN "territoryName" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "address" SET DATA TYPE TEXT,
ALTER COLUMN "avatarUrl" SET DATA TYPE TEXT,
ALTER COLUMN "city" SET DATA TYPE TEXT,
ALTER COLUMN "firstName" SET DATA TYPE TEXT,
ALTER COLUMN "lastName" SET DATA TYPE TEXT,
ALTER COLUMN "passwordHash" SET DATA TYPE TEXT,
ALTER COLUMN "phone" SET DATA TYPE TEXT,
ALTER COLUMN "state" SET DATA TYPE TEXT,
ALTER COLUMN "zipCode" SET DATA TYPE TEXT,
ALTER COLUMN "designation" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "UserSchedule" ALTER COLUMN "dayOfWeek" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_username_key" ON "Client"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
