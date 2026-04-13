/**
 * Script de nettoyage COMPLET des données test.
 * 
 * Supprime :
 * 1. Tous les sellers avec email @coach-test.com (cascade → orders, blocks, customers, withdrawals, etc.)
 * 2. Orders restantes avec paymentProvider dev_credit/dev_simulation
 * 3. Orders restantes avec customerEmail dev@test.com / simulation@dev.test
 * 4. Verification codes expirés
 * 
 * Usage: npx tsx scripts/cleanup-test-data.ts [--dry-run]
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant");
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(DRY_RUN ? "🔍 MODE DRY-RUN — aucune suppression\n" : "🗑️  MODE SUPPRESSION\n");

  // ── 1. Sellers test (@coach-test.com + comptes test perso) ──
  const PERSO_TEST_SLUGS = ["test-fari", "test-fari2", "amadou-test", "amadou-test2", "amadou-test3"];
  const testSellers = await prisma.seller.findMany({
    where: {
      OR: [
        { email: { endsWith: "@coach-test.com" } },
        { slug: { in: PERSO_TEST_SLUGS } },
      ],
    },
    select: { id: true, email: true, slug: true },
  });
  console.log(`👤 Sellers test: ${testSellers.length} (@coach-test.com + perso)`);

  const testSellerIds = testSellers.map(s => s.id);

  // Count related data
  if (testSellerIds.length > 0) {
    const [orders, withdrawals, customers, blocks, pageViews, blockClicks] = await Promise.all([
      prisma.order.count({ where: { sellerId: { in: testSellerIds } } }),
      prisma.withdrawal.count({ where: { sellerId: { in: testSellerIds } } }),
      prisma.customer.count({ where: { sellerId: { in: testSellerIds } } }),
      prisma.block.count({ where: { sellerId: { in: testSellerIds } } }),
      prisma.pageView.count({ where: { sellerId: { in: testSellerIds } } }),
      prisma.blockClick.count({ where: { sellerId: { in: testSellerIds } } }),
    ]);
    console.log(`   → ${orders} orders, ${withdrawals} withdrawals, ${customers} customers, ${blocks} blocks, ${pageViews} pageViews, ${blockClicks} blockClicks`);
  }

  // ── 2. Orders test restantes (provider dev) ──
  const devOrders = await prisma.order.findMany({
    where: { paymentProvider: { in: ["dev_credit", "dev_simulation"] }, sellerId: { notIn: testSellerIds } },
    select: { id: true, reference: true, amount: true },
  });
  console.log(`\n� Orders dev (hors sellers test): ${devOrders.length}`);
  devOrders.forEach(o => console.log(`   - ${o.reference} | ${o.amount} FCFA`));

  // ── 3. Orders avec emails test ──
  const testEmailOrders = await prisma.order.findMany({
    where: { customerEmail: { in: ["dev@test.com", "simulation@dev.test"] }, sellerId: { notIn: testSellerIds } },
    select: { id: true, reference: true, amount: true, customerEmail: true },
  });
  console.log(`\n📦 Orders emails test (hors sellers test): ${testEmailOrders.length}`);
  testEmailOrders.forEach(o => console.log(`   - ${o.reference} | ${o.amount} FCFA | ${o.customerEmail}`));

  // ── 4. Verification codes expirés ──
  const expiredCodes = await prisma.verificationCode.count({ where: { expiresAt: { lt: new Date() } } });
  console.log(`\n🔑 Verification codes expirés: ${expiredCodes}`);

  // ── 5. Real sellers qui restent ──
  const realSellers = await prisma.seller.findMany({
    where: { deletedAt: null, id: { notIn: testSellerIds } },
    select: { id: true, email: true, slug: true, kycStatus: true },
  });
  console.log(`\n✅ Comptes RÉELS qui restent (${realSellers.length}):`);
  realSellers.forEach(s => console.log(`   - ${s.slug} | ${s.email} | kyc=${s.kycStatus}`));

  if (DRY_RUN) {
    console.log("\n✅ Dry-run terminé. Relance sans --dry-run pour supprimer.");
    return;
  }

  // ══════════════════════════════════════════════
  // SUPPRESSION
  // ══════════════════════════════════════════════
  console.log("\n🔥 Suppression en cours...\n");

  // 1. Supprimer les sellers test (cascade supprime orders, blocks, customers, withdrawals, etc.)
  if (testSellerIds.length > 0) {
    // Delete children that don't cascade automatically
    await prisma.slugHistory.deleteMany({ where: { sellerId: { in: testSellerIds } } });
    
    const r = await prisma.seller.deleteMany({ where: { id: { in: testSellerIds } } });
    console.log(`   ✓ ${r.count} sellers test supprimés (+ cascade: orders, blocks, customers, withdrawals, pageViews, etc.)`);
  }

  // 2. Orders dev restantes
  if (devOrders.length > 0) {
    // Delete bump selections first
    await prisma.orderBumpSelection.deleteMany({ where: { orderId: { in: devOrders.map(o => o.id) } } });
    const r = await prisma.order.deleteMany({ where: { id: { in: devOrders.map(o => o.id) } } });
    console.log(`   ✓ ${r.count} orders dev supprimées`);
  }

  // 3. Orders emails test restantes
  if (testEmailOrders.length > 0) {
    await prisma.orderBumpSelection.deleteMany({ where: { orderId: { in: testEmailOrders.map(o => o.id) } } });
    const r = await prisma.order.deleteMany({ where: { id: { in: testEmailOrders.map(o => o.id) } } });
    console.log(`   ✓ ${r.count} orders email test supprimées`);
  }

  // 4. Verification codes expirés
  if (expiredCodes > 0) {
    const r = await prisma.verificationCode.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    console.log(`   ✓ ${r.count} verification codes expirés supprimés`);
  }

  // 5. Recalculer totalSales/totalRevenue pour les produits des real sellers
  const products = await prisma.product.findMany({ select: { id: true } });
  for (const product of products) {
    const stats = await prisma.order.aggregate({
      where: { productId: product.id, paymentStatus: "PAID", deletedAt: null },
      _count: true,
      _sum: { sellerAmount: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { totalSales: stats._count, totalRevenue: stats._sum.sellerAmount || 0 },
    });
  }
  console.log(`   ✓ totalSales/totalRevenue recalculés pour ${products.length} produits`);

  // 6. Customers orphelins (avec 0 orders)
  const orphanCustomers = await prisma.customer.findMany({
    where: { orderCount: 0 },
    select: { id: true },
  });
  if (orphanCustomers.length > 0) {
    const r = await prisma.customer.deleteMany({ where: { id: { in: orphanCustomers.map(c => c.id) } } });
    console.log(`   ✓ ${r.count} customers orphelins supprimés`);
  }

  console.log("\n✅ Nettoyage terminé !");
}

main()
  .catch((err) => {
    console.error("❌ Erreur:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
