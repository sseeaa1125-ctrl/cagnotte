import { prisma } from "../src/lib/prisma.js";

async function main() {
  // Find pending community payments
  const pending = await prisma.communityPayment.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      reference: true,
      status: true,
      amount: true,
      createdAt: true,
      subscription: { select: { memberEmail: true, communityId: true } },
    },
  });

  console.log(`Found ${pending.length} PENDING community payment(s):`);
  for (const p of pending) {
    console.log(`  - ${p.reference} | ${p.amount} FCFA | ${p.subscription.memberEmail} | ${p.createdAt.toISOString()}`);
  }

  if (pending.length > 0) {
    // Expire old pending payments (older than 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const old = pending.filter((p) => p.createdAt < thirtyMinAgo);
    console.log(`\nExpiring ${old.length} payment(s) older than 30 min...`);

    for (const p of old) {
      await prisma.communityPayment.update({
        where: { id: p.id },
        data: { status: "FAILED" },
      });
      console.log(`  ✓ ${p.reference} → FAILED`);
    }
  }

  await prisma.$disconnect();
}

main();
