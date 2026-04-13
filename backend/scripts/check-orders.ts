import { prisma } from "../src/lib/prisma.js";

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      reference: true,
      paymentStatus: true,
      paymentExternalId: true,
      amount: true,
      createdAt: true,
    },
  });
  console.log("=== RECENT ORDERS ===");
  for (const o of orders) console.log(JSON.stringify(o));

  const logs = await prisma.webhookLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      provider: true,
      eventType: true,
      externalId: true,
      status: true,
      createdAt: true,
    },
  });
  console.log("\n=== RECENT WEBHOOK LOGS ===");
  for (const l of logs) console.log(JSON.stringify(l));

  await prisma.$disconnect();
}

main();
