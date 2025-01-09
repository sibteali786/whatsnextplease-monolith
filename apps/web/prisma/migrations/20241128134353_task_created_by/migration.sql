/*
  Warnings:

  - You are about to drop the column `createdById` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `createdByType` on the `Task` table. All the data in the column will be lost.
  - Added the required column `creatorType` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "fk_createdByClient";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "fk_createdByUser";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "createdById",
DROP COLUMN "createdByType",
ADD COLUMN     "createdByClientId" TEXT,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "creatorType" "CreatorType" NOT NULL;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByClientId_fkey" FOREIGN KEY ("createdByClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
