-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TaskPriorityEnum" ADD VALUE 'CRITICAL';
ALTER TYPE "public"."TaskPriorityEnum" ADD VALUE 'HIGH';
ALTER TYPE "public"."TaskPriorityEnum" ADD VALUE 'MEDIUM';
ALTER TYPE "public"."TaskPriorityEnum" ADD VALUE 'LOW';
ALTER TYPE "public"."TaskPriorityEnum" ADD VALUE 'HOLD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'REVIEW';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'CONTENT_IN_PROGRESS';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'TESTING';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'BLOCKED';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'ON_HOLD';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'APPROVED';
ALTER TYPE "public"."TaskStatusEnum" ADD VALUE 'REJECTED';
