/*
  Warnings:

  - Added the required column `passwordHash` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "passwordHash" TEXT NOT NULL;
