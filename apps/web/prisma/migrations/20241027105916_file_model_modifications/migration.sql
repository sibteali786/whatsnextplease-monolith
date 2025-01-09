/*
  Warnings:

  - Added the required column `fileSize` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_fileCategoryId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "uploadedBy" VARCHAR(100) NOT NULL,
ALTER COLUMN "fileCategoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_fileCategoryId_fkey" FOREIGN KEY ("fileCategoryId") REFERENCES "FileCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
