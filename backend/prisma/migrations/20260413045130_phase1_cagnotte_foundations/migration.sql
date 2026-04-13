-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DONATION_RECEIVED', 'MILESTONE_REACHED', 'CAGNOTTE_ENDING_SOON', 'CAGNOTTE_ENDED', 'DONATION_MESSAGE', 'PAYOUT_COMPLETED', 'PAYOUT_FAILED', 'KYC_APPROVED', 'KYC_REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlockType" ADD VALUE 'DONATION';
ALTER TYPE "BlockType" ADD VALUE 'FUNDRAISER';
ALTER TYPE "BlockType" ADD VALUE 'FORMATION';

-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'DONATION';

-- DropIndex
DROP INDEX "PartnershipRequest_sellerId_archivedAt_idx";

-- AlterTable
ALTER TABLE "Block" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "BookingService" ADD COLUMN     "ctaStyle" TEXT NOT NULL DEFAULT 'button';

-- AlterTable
ALTER TABLE "CommunityPayment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CommunitySubscription" ADD COLUMN     "memberCountry" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "messageIsPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "refundBictorysId" TEXT,
ADD COLUMN     "refundReference" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "files" JSONB,
ADD COLUMN     "systemeioCourseId" TEXT;

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN     "emailUnsubscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "googleAdsId" TEXT,
ADD COLUMN     "googleAnalyticsId" TEXT,
ADD COLUMN     "imageStyle" TEXT,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metaPixelId" TEXT,
ADD COLUMN     "snapchatUrl" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "supportPhone" TEXT,
ADD COLUMN     "tiktokPixelId" TEXT,
ADD COLUMN     "withdrawalPinHash" TEXT;

-- CreateTable
CREATE TABLE "SlugHistory" (
    "id" TEXT NOT NULL,
    "oldSlug" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "icon" TEXT,
    "blockId" TEXT,
    "orderId" TEXT,
    "withdrawalId" TEXT,
    "data" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramVerification" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chatId" BIGINT,
    "chatTitle" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleIntegration" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMarketingIntegration" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "listId" TEXT,
    "serverPrefix" TEXT,
    "syncEvents" TEXT NOT NULL DEFAULT 'all',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMarketingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sellerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlugHistory_sellerId_idx" ON "SlugHistory"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SlugHistory_oldSlug_key" ON "SlugHistory"("oldSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_sellerId_createdAt_idx" ON "Notification"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_sellerId_readAt_idx" ON "Notification"("sellerId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramVerification_code_key" ON "TelegramVerification"("code");

-- CreateIndex
CREATE INDEX "TelegramVerification_sellerId_idx" ON "TelegramVerification"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleIntegration_sellerId_key" ON "GoogleIntegration"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMarketingIntegration_sellerId_key" ON "EmailMarketingIntegration"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_sellerId_idx" ON "PushSubscription"("sellerId");

-- CreateIndex
CREATE INDEX "Report_sellerId_idx" ON "Report"("sellerId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Block_slug_key" ON "Block"("slug");

-- CreateIndex
CREATE INDEX "Block_slug_idx" ON "Block"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Community_telegramChatId_key" ON "Community"("telegramChatId");

-- CreateIndex
CREATE INDEX "CommunityPayment_status_idx" ON "CommunityPayment"("status");

-- CreateIndex
CREATE INDEX "Order_blockId_idx" ON "Order"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookLog_externalId_eventType_key" ON "WebhookLog"("externalId", "eventType");

-- AddForeignKey
ALTER TABLE "SlugHistory" ADD CONSTRAINT "SlugHistory_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramVerification" ADD CONSTRAINT "TelegramVerification_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleIntegration" ADD CONSTRAINT "GoogleIntegration_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMarketingIntegration" ADD CONSTRAINT "EmailMarketingIntegration_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

