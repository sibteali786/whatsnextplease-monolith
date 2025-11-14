-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "associatedClientId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_associatedClientId_fkey" FOREIGN KEY ("associatedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
