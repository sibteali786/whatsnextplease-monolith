-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "country" TEXT DEFAULT 'US';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT;
