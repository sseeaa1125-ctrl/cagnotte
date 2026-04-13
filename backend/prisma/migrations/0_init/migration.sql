-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('LINK', 'SALE', 'BOOKING', 'PAYMENT', 'LEAD_MAGNET', 'WAITING_LIST', 'PARTNERSHIP', 'COMMUNITY', 'TEXT', 'VIDEO', 'IMAGE', 'DIVIDER', 'IFRAME', 'VIDEO_EMBED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SALE', 'BOOKING', 'PAYMENT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommunitySubStatus" AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "CommunityPaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommunityNotifType" AS ENUM ('RENEWAL_REMINDER', 'PAYMENT_FAILED', 'GRACE_DAY_1', 'GRACE_DAY_2', 'GRACE_DAY_3', 'KICKED', 'WELCOME', 'CANCELED');

-- CreateEnum
CREATE TYPE "CommunityNotifChannel" AS ENUM ('EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT');

-- CreateTable
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "googleId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "coverUrl" TEXT,
    "showAvatar" BOOLEAN NOT NULL DEFAULT true,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "youtubeUrl" TEXT,
    "facebookUrl" TEXT,
    "whatsappNumber" TEXT,
    "twitterUrl" TEXT,
    "telegramUrl" TEXT,
    "websiteUrl" TEXT,
    "themeId" TEXT NOT NULL DEFAULT 'default',
    "themeFont" TEXT NOT NULL DEFAULT 'inter',
    "themeColors" JSONB,
    "bgImageUrl" TEXT,
    "headerLayout" TEXT NOT NULL DEFAULT 'centered',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Dakar',
    "payoutPhone" TEXT,
    "payoutProvider" TEXT,
    "payoutName" TEXT,
    "payoutCountry" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'NONE',
    "kycIdUrl" TEXT,
    "kycSelfieUrl" TEXT,
    "kycFullName" TEXT,
    "kycSubmittedAt" TIMESTAMP(3),
    "kycReviewedAt" TIMESTAMP(3),
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "activity" TEXT,
    "phone" TEXT,
    "phoneCountry" TEXT,
    "notificationPrefs" JSONB,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planExpiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "withdrawalBlocked" BOOLEAN NOT NULL DEFAULT false,
    "withdrawalBlockedAt" TIMESTAMP(3),
    "withdrawalBlockReason" TEXT,
    "customCommissionRate" INTEGER,
    "hardDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "coverUrl" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "redirectUrl" TEXT,
    "buttonText" TEXT NOT NULL DEFAULT 'Acheter',
    "ctaStyle" TEXT NOT NULL DEFAULT 'button',
    "discountPrice" INTEGER,
    "confirmationEmailSubject" TEXT,
    "confirmationEmailBody" TEXT,
    "videoUrl" TEXT,
    "checkoutSections" JSONB,
    "leadFields" JSONB,
    "maxSubscribers" INTEGER,
    "showSubscriberCount" BOOLEAN NOT NULL DEFAULT true,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "duration" INTEGER NOT NULL,
    "location" TEXT,
    "coverUrl" TEXT,
    "buttonText" TEXT,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 24,
    "confirmationEmailSubject" TEXT,
    "confirmationEmailBody" TEXT,
    "videoUrl" TEXT,
    "checkoutSections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderBump" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBump_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSlot" (
    "id" TEXT NOT NULL,
    "bookingServiceId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "commissionRate" INTEGER NOT NULL,
    "commissionAmount" INTEGER NOT NULL,
    "sellerAmount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT NOT NULL DEFAULT 'bictorys',
    "paymentExternalId" TEXT,
    "paymentOperator" TEXT,
    "paidAt" TIMESTAMP(3),
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "productId" TEXT,
    "bookingServiceId" TEXT,
    "downloadUrl" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "downloadExpiresAt" TIMESTAMP(3),
    "bookingDate" TIMESTAMP(3),
    "bookingDuration" INTEGER,
    "bookingLocation" TEXT,
    "bookingCancelled" BOOLEAN NOT NULL DEFAULT false,
    "bookingCancelledAt" TIMESTAMP(3),
    "paymentNote" TEXT,
    "donorMessage" TEXT,
    "customFields" JSONB,
    "source" TEXT,
    "country" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderBumpSelection" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderBumpId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderBumpSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "recipientName" TEXT,
    "note" TEXT,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "bictorysTransactionId" TEXT,
    "merchantFee" INTEGER,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ip" TEXT,
    "country" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockClick" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'click',
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipRequest" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "budget" TEXT,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBot" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT NOT NULL,
    "botName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "telegramBotId" TEXT NOT NULL,
    "telegramChatId" BIGINT NOT NULL,
    "telegramChatTitle" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "subscribeFields" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunitySubscription" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "memberEmail" TEXT NOT NULL,
    "memberName" TEXT,
    "memberPhone" TEXT,
    "telegramUserId" BIGINT,
    "telegramUsername" TEXT,
    "customFields" JSONB,
    "status" "CommunitySubStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "inviteLink" TEXT,
    "inviteLinkExpiresAt" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "gracePeriodEnd" TIMESTAMP(3),
    "lockedPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunitySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "commissionRate" INTEGER NOT NULL DEFAULT 500,
    "commissionAmount" INTEGER NOT NULL DEFAULT 0,
    "sellerAmount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'bictorys',
    "providerTransactionId" TEXT,
    "status" "CommunityPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentUrl" TEXT,
    "reference" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityNotification" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" "CommunityNotifType" NOT NULL,
    "channel" "CommunityNotifChannel" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_email_key" ON "Seller"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_googleId_key" ON "Seller"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Seller_slug_key" ON "Seller"("slug");

-- CreateIndex
CREATE INDEX "Seller_deletedAt_idx" ON "Seller"("deletedAt");

-- CreateIndex
CREATE INDEX "Block_sellerId_position_idx" ON "Block"("sellerId", "position");

-- CreateIndex
CREATE INDEX "Block_sellerId_isActive_idx" ON "Block"("sellerId", "isActive");

-- CreateIndex
CREATE INDEX "Block_sellerId_type_idx" ON "Block"("sellerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Product_blockId_key" ON "Product"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingService_blockId_key" ON "BookingService"("blockId");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "OrderBump_productId_idx" ON "OrderBump"("productId");

-- CreateIndex
CREATE INDEX "BookingSlot_bookingServiceId_dayOfWeek_idx" ON "BookingSlot"("bookingServiceId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_sellerId_createdAt_idx" ON "Order"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_sellerId_paymentStatus_idx" ON "Order"("sellerId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_paymentExternalId_idx" ON "Order"("paymentExternalId");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "Order"("productId");

-- CreateIndex
CREATE INDEX "Order_bookingServiceId_idx" ON "Order"("bookingServiceId");

-- CreateIndex
CREATE INDEX "Order_sellerId_source_idx" ON "Order"("sellerId", "source");

-- CreateIndex
CREATE INDEX "OrderBumpSelection_orderId_idx" ON "OrderBumpSelection"("orderId");

-- CreateIndex
CREATE INDEX "Customer_sellerId_idx" ON "Customer"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_sellerId_email_key" ON "Customer"("sellerId", "email");

-- CreateIndex
CREATE INDEX "FileUpload_sellerId_idx" ON "FileUpload"("sellerId");

-- CreateIndex
CREATE INDEX "WebhookLog_provider_externalId_idx" ON "WebhookLog"("provider", "externalId");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "VerificationCode_email_code_idx" ON "VerificationCode"("email", "code");

-- CreateIndex
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_reference_key" ON "Withdrawal"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_idempotencyKey_key" ON "Withdrawal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Withdrawal_sellerId_status_idx" ON "Withdrawal"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Withdrawal_sellerId_createdAt_idx" ON "Withdrawal"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_sellerId_createdAt_idx" ON "PageView"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_sellerId_source_idx" ON "PageView"("sellerId", "source");

-- CreateIndex
CREATE INDEX "PageView_sellerId_country_idx" ON "PageView"("sellerId", "country");

-- CreateIndex
CREATE INDEX "BlockClick_sellerId_createdAt_idx" ON "BlockClick"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "BlockClick_blockId_createdAt_idx" ON "BlockClick"("blockId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipRequest_sellerId_createdAt_idx" ON "PartnershipRequest"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipRequest_blockId_createdAt_idx" ON "PartnershipRequest"("blockId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBot_sellerId_key" ON "TelegramBot"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Community_blockId_key" ON "Community"("blockId");

-- CreateIndex
CREATE INDEX "Community_sellerId_idx" ON "Community"("sellerId");

-- CreateIndex
CREATE INDEX "CommunitySubscription_communityId_idx" ON "CommunitySubscription"("communityId");

-- CreateIndex
CREATE INDEX "CommunitySubscription_communityId_status_idx" ON "CommunitySubscription"("communityId", "status");

-- CreateIndex
CREATE INDEX "CommunitySubscription_status_idx" ON "CommunitySubscription"("status");

-- CreateIndex
CREATE INDEX "CommunitySubscription_currentPeriodEnd_idx" ON "CommunitySubscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySubscription_communityId_memberEmail_key" ON "CommunitySubscription"("communityId", "memberEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CommunitySubscription_communityId_telegramUserId_key" ON "CommunitySubscription"("communityId", "telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPayment_reference_key" ON "CommunityPayment"("reference");

-- CreateIndex
CREATE INDEX "CommunityPayment_subscriptionId_idx" ON "CommunityPayment"("subscriptionId");

-- CreateIndex
CREATE INDEX "CommunityPayment_communityId_idx" ON "CommunityPayment"("communityId");

-- CreateIndex
CREATE INDEX "CommunityNotification_subscriptionId_type_idx" ON "CommunityNotification"("subscriptionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "AdminLog_adminId_createdAt_idx" ON "AdminLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_action_idx" ON "AdminLog"("action");

-- CreateIndex
CREATE INDEX "AdminLog_target_idx" ON "AdminLog"("target");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_key_key" ON "PlatformConfig"("key");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBump" ADD CONSTRAINT "OrderBump_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_bookingServiceId_fkey" FOREIGN KEY ("bookingServiceId") REFERENCES "BookingService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingServiceId_fkey" FOREIGN KEY ("bookingServiceId") REFERENCES "BookingService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBumpSelection" ADD CONSTRAINT "OrderBumpSelection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBumpSelection" ADD CONSTRAINT "OrderBumpSelection_orderBumpId_fkey" FOREIGN KEY ("orderBumpId") REFERENCES "OrderBump"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockClick" ADD CONSTRAINT "BlockClick_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockClick" ADD CONSTRAINT "BlockClick_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipRequest" ADD CONSTRAINT "PartnershipRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBot" ADD CONSTRAINT "TelegramBot_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_telegramBotId_fkey" FOREIGN KEY ("telegramBotId") REFERENCES "TelegramBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunitySubscription" ADD CONSTRAINT "CommunitySubscription_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPayment" ADD CONSTRAINT "CommunityPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CommunitySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPayment" ADD CONSTRAINT "CommunityPayment_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityNotification" ADD CONSTRAINT "CommunityNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CommunitySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

