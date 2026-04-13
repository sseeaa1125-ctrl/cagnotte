-- AddColumn: Seller.lastInboxSeenAt
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "lastInboxSeenAt" TIMESTAMP(3);

-- AddColumn: Seller.lastOrdersSeenAt
ALTER TABLE "Seller" ADD COLUMN IF NOT EXISTS "lastOrdersSeenAt" TIMESTAMP(3);

-- AddColumn: PartnershipRequest.readAt
ALTER TABLE "PartnershipRequest" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- CreateIndex: PartnershipRequest(sellerId, readAt)
CREATE INDEX IF NOT EXISTS "PartnershipRequest_sellerId_readAt_idx" ON "PartnershipRequest"("sellerId", "readAt");
