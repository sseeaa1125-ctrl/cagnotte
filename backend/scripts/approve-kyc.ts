/**
 * Manual KYC approval/rejection helper for v1 (no admin panel yet).
 *
 * Usage:
 *   cd backend && npx tsx scripts/approve-kyc.ts <seller-slug> [APPROVED|REJECTED] [reason]
 *
 * Default status: APPROVED.
 * Fires KYC_APPROVED / KYC_REJECTED notification via createNotification.
 *
 * Phase 2 plan 02-03 — T-02-19 mitigation: KYC fire site is this script ONLY.
 * No HTTP route triggers fireKycApproved/fireKycRejected; v2 admin panel will
 * own the audit trail.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  fireKycApproved,
  fireKycRejected,
} from "../src/lib/notifications/dispatch.js";

async function main(): Promise<void> {
  const [, , slug, statusArg, ...reasonParts] = process.argv;

  if (!slug) {
    console.error(
      "Usage: tsx scripts/approve-kyc.ts <seller-slug> [APPROVED|REJECTED] [reason]",
    );
    process.exit(1);
  }

  const status = (statusArg || "APPROVED").toUpperCase();
  if (status !== "APPROVED" && status !== "REJECTED") {
    console.error(`Statut invalide: ${status}. Utilise APPROVED ou REJECTED.`);
    process.exit(1);
  }

  const reason = reasonParts.join(" ") || "Documents non conformes";

  const seller = await prisma.seller.findUnique({
    where: { slug },
    select: { id: true, slug: true, email: true, kycStatus: true },
  });
  if (!seller) {
    console.error(`Vendeur introuvable pour le slug: ${slug}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const previousStatus = seller.kycStatus;

  await prisma.seller.update({
    where: { id: seller.id },
    data: {
      kycStatus: status,
      kycReviewedAt: new Date(),
    },
  });

  const actor = process.env.USER || "unknown";
  const ts = new Date().toISOString();

  if (status === "APPROVED") {
    const result = await fireKycApproved({ id: seller.id });
    console.log(
      `[${ts}] [actor=${actor}] ✓ Seller ${slug} (${seller.id}): ${previousStatus} → APPROVED. Notification: ${
        result.created ? "fired" : "deduped"
      }.`,
    );
  } else {
    const result = await fireKycRejected({ id: seller.id }, reason);
    console.log(
      `[${ts}] [actor=${actor}] ✓ Seller ${slug} (${seller.id}): ${previousStatus} → REJECTED. Raison: ${reason}. Notification: ${
        result.created ? "fired" : "deduped"
      }.`,
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await prisma.$disconnect();
  } catch {
    /* noop */
  }
  process.exit(1);
});
