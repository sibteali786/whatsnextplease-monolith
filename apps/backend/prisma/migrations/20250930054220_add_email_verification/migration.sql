-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "public"."EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_token_idx" ON "public"."EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "public"."EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_clientId_idx" ON "public"."EmailVerificationToken"("clientId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "public"."EmailVerificationToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
