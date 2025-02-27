-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "lastDeliveryAttempt" TIMESTAMP(3);
