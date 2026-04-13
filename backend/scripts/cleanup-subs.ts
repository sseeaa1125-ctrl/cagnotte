import { prisma } from "../src/lib/prisma.js";

async function main() {
  // Find ALL pending subscriptions and cancel them
  const pendingSubs = await prisma.communitySubscription.findMany({
    where: { status: "PENDING" },
    select: { id: true, memberEmail: true, createdAt: true, community: { select: { title: true } } },
  });

  console.log(`Found ${pendingSubs.length} PENDING subscription(s)`);
  for (const s of pendingSubs) {
    await prisma.communityPayment.updateMany({
      where: { subscriptionId: s.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await prisma.communitySubscription.update({
      where: { id: s.id },
      data: { status: "CANCELED" },
    });
    console.log(`  ✓ ${s.memberEmail} | ${s.community.title} → CANCELED`);
  }

  await prisma.$disconnect();
}

main();
