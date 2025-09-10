BEGIN;

-- Add createdAt column with default value
ALTER TABLE "TaskPriority" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updatedAt column with default value (initially same as createdAt)
ALTER TABLE "TaskPriority" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

COMMIT;