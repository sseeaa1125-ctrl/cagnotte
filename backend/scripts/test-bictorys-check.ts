import { BictorysProvider } from "../src/lib/payments/bictorys.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  // 1. Check Bictorys status for the most recent real order
  const order = await prisma.order.findFirst({
    where: { paymentExternalId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { reference: true, paymentStatus: true, paymentExternalId: true, amount: true },
  });

  if (!order || !order.paymentExternalId) {
    console.log("No order with paymentExternalId found");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n=== Checking order ${order.reference} ===`);
  console.log(`DB status: ${order.paymentStatus}`);
  console.log(`Bictorys txn ID: ${order.paymentExternalId}`);
  console.log(`Amount: ${order.amount} FCFA`);

  // 2. Call Bictorys API directly
  const bictorys = new BictorysProvider();
  const result = await bictorys.checkTransactionStatus(order.paymentExternalId);

  if (result) {
    console.log(`\n=== Bictorys API response ===`);
    console.log(`Bictorys status: ${result.status}`);
    // amount / paymentReference retirés depuis la migration vers
    // GET /pay/v1/transactions/:id/status?by_charge_id=true (avril 2026).
  } else {
    console.log("\nBictorys API returned null (check failed or API not configured)");
  }

  // 3. Test ngrok tunnel
  console.log("\n=== Testing ngrok tunnel ===");
  try {
    const ngrokRes = await fetch("https://larraine-superfeminine-blinkingly.ngrok-free.dev/api/health");
    const data = await ngrokRes.json();
    console.log(`Ngrok -> Backend: ${ngrokRes.status} ${JSON.stringify(data)}`);
  } catch (err) {
    console.log(`Ngrok tunnel FAILED: ${err}`);
  }

  await prisma.$disconnect();
}

main();
