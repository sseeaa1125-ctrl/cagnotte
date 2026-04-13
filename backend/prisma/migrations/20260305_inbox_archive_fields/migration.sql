-- AddColumn: Order.inboxReadAt — Quand le vendeur a lu ce message dans l'inbox
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "inboxReadAt" TIMESTAMP(3);

-- AddColumn: Order.inboxArchivedAt — Quand le vendeur a archivé ce message
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "inboxArchivedAt" TIMESTAMP(3);

-- AddColumn: PartnershipRequest.archivedAt — Quand le vendeur a archivé cette demande
ALTER TABLE "PartnershipRequest" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AddColumn: CommunitySubscription.memberPaymentType — Méthode de paiement pour le renouvellement
ALTER TABLE "CommunitySubscription" ADD COLUMN IF NOT EXISTS "memberPaymentType" TEXT;

-- Index: Order inbox non-lus pour le compteur
CREATE INDEX IF NOT EXISTS "Order_sellerId_inboxReadAt_idx" ON "Order"("sellerId", "inboxReadAt") WHERE "inboxReadAt" IS NULL AND "paymentStatus" = 'PAID';

-- Index: PartnershipRequest archivage
CREATE INDEX IF NOT EXISTS "PartnershipRequest_sellerId_archivedAt_idx" ON "PartnershipRequest"("sellerId", "archivedAt");
