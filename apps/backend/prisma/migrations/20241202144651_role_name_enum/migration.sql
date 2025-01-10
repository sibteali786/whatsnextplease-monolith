/*
  Warnings:

  - The `name` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('SUPER_USER', 'DISTRICT_MANAGER', 'TERRITORY_MANAGER', 'ACCOUNT_EXECUTIVE', 'TASK_SUPERVISOR', 'TASK_AGENT', 'CLIENT');

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "name",
ADD COLUMN     "name" "Roles" NOT NULL DEFAULT 'SUPER_USER';

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
