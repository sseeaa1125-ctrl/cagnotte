/**
 * PA3: Migration script — Marquer les anciens messages inbox comme lus
 * 
 * Les orders avec donorMessage ou paymentNote qui étaient PAID avant
 * l'introduction de inboxReadAt apparaissent comme "non lus" dans l'inbox.
 * Ce script les marque comme lus (inboxReadAt = paidAt).
 * 
 * Usage: npx tsx backend/scripts/migrate-inbox-read.ts
 */
import { prisma } from "../src/lib/prisma.js";

async function main() {
  // Marquer les donations/payments avec message comme lus
  // (ceux qui existaient avant le champ inboxReadAt)
  const donations = await prisma.order.updateMany({
    where: {
      paymentStatus: "PAID",
      donorMessage: { not: null },
      inboxReadAt: null,
      orderType: { in: ["DONATION", "PAYMENT"] },
    },
    data: { inboxReadAt: new Date() },
  });
  console.log(`✅ ${donations.count} donations marquées comme lues`);

  const payments = await prisma.order.updateMany({
    where: {
      paymentStatus: "PAID",
      paymentNote: { not: null },
      inboxReadAt: null,
      orderType: { notIn: ["DONATION", "PAYMENT"] },
    },
    data: { inboxReadAt: new Date() },
  });
  console.log(`✅ ${payments.count} paiements avec note marqués comme lus`);

  // Marquer les partenariats existants non lus comme lus
  const partnerships = await prisma.partnershipRequest.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  console.log(`✅ ${partnerships.count} partenariats marqués comme lus`);

  console.log("\n🎉 Migration inbox terminée");
}

main()
  .catch((err) => {
    console.error("❌ Erreur migration:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
