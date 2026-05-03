-- Phase 1+ workflow paiement carte bancaire
--
-- 1. Ajout des deux valeurs de l'enum NotificationType utilisées par
--    fireCardApproved / fireCardRejected (cf. backend/src/lib/notifications/dispatch.ts).
--    ALTER TYPE … ADD VALUE est non-transactionnel en Postgres, d'où le hack
--    ci-dessous : COMMIT explicite avant chaque ADD VALUE pour les outils
--    qui wrappent la migration dans une transaction (Prisma migrate utilise
--    une transaction par migration depuis 5.x — IF NOT EXISTS rend idempotent).
--
-- 2. Index JSON partiel sur Block.config->>'cardStatus' = 'REQUESTED' pour
--    accélérer le badge admin (pendingCardRequests) et la queue
--    /admin/cagnottes/card-requests. Partial index → ne couvre que les rows
--    actives, ne dépasse pas 1k entrées même à grande échelle.
--    (Audit-039 A-1.)

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CARD_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CARD_REJECTED';

CREATE INDEX IF NOT EXISTS "Block_card_status_requested_idx"
  ON "Block" ((("config"->>'cardStatus')))
  WHERE "type" = 'FUNDRAISER' AND "config"->>'cardStatus' = 'REQUESTED';
