/**
 * Phase 2 plan 02-03 — dev fixtures for the smoke-test exit gate.
 *
 * Creates idempotent test data:
 *   - 2 sellers (1 KYC_APPROVED with PIN, 1 KYC_NONE without PIN)
 *   - 4 cagnottes (2 festive Seller A, 2 solidaire Seller B incl. 1 PRIVATE)
 *   - 10 PAID orders distributed across the 4 cagnottes (mixed anonymity + private msgs)
 *   - 5 notifications per seller (DONATION_RECEIVED via createNotification, deduped)
 *
 * Idempotent: re-runs upsert/skip duplicates. Uses email suffix
 * `@test.cagnottes.sn` and slug prefix `test-` so cleanup is straightforward.
 *
 * Usage:
 *   cd backend && npx tsx scripts/seed-dev.ts          # seed
 *   cd backend && npx tsx scripts/seed-dev.ts --reset  # delete then exit
 *
 * SAFETY: This script is for local dev only. Never run against production.
 * Fixtures are namespaced under `@test.cagnottes.sn` so the cleanup blast
 * radius is limited.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { computeCommission } from "../src/lib/commission.js";
import { createNotification } from "../src/lib/notifications/index.js";

// ─── Reset ────────────────────────────────────────────────────────────────────

async function reset(): Promise<void> {
  const sellers = await prisma.seller.findMany({
    where: { email: { endsWith: "@test.cagnottes.sn" } },
    select: { id: true },
  });
  const sellerIds = sellers.map((s) => s.id);

  if (sellerIds.length === 0) {
    console.log("✓ Reset: aucune fixture à supprimer.");
    return;
  }

  // Order matters: child rows first (FK constraints), but Cascade should also handle most.
  await prisma.notification.deleteMany({ where: { sellerId: { in: sellerIds } } });
  await prisma.order.deleteMany({ where: { sellerId: { in: sellerIds } } });
  await prisma.block.deleteMany({ where: { sellerId: { in: sellerIds } } });
  await prisma.seller.deleteMany({ where: { id: { in: sellerIds } } });
  console.log(`✓ Reset: ${sellerIds.length} seller(s) supprimés.`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface BlockSeed {
  slug: string;
  sellerId: string;
  title: string;
  position: number;
  config: Record<string, unknown>;
}

async function upsertBlock(seed: BlockSeed): Promise<{ id: string; slug: string }> {
  const existing = await prisma.block.findUnique({
    where: { slug: seed.slug },
    select: { id: true, slug: true },
  });
  if (existing) return existing as { id: string; slug: string };

  const created = await prisma.block.create({
    data: {
      sellerId: seed.sellerId,
      type: "FUNDRAISER",
      title: seed.title,
      position: seed.position,
      isActive: true,
      slug: seed.slug,
      config: seed.config as object,
    },
    select: { id: true, slug: true },
  });
  return created as { id: string; slug: string };
}

interface OrderSeed {
  reference: string;
  blockId: string;
  sellerId: string;
  amount: number;
  customerName: string | null;
  customerEmail: string;
  isAnonymous: boolean;
  messageIsPrivate: boolean;
  donorMessage: string | null;
  subtype: "festive" | "solidaire";
}

async function upsertOrder(seed: OrderSeed): Promise<void> {
  const existing = await prisma.order.findUnique({
    where: { reference: seed.reference },
    select: { id: true },
  });
  if (existing) return;

  const { rate, commission, net } = computeCommission(seed.amount, seed.subtype);

  await prisma.order.create({
    data: {
      reference: seed.reference,
      sellerId: seed.sellerId,
      orderType: "DONATION",
      amount: seed.amount,
      currency: "XOF",
      commissionRate: rate,
      commissionAmount: commission,
      sellerAmount: net,
      paymentStatus: "PAID",
      paymentProvider: "test_seed",
      paidAt: new Date(),
      customerEmail: seed.customerEmail,
      customerName: seed.customerName,
      isAnonymous: seed.isAnonymous,
      messageIsPrivate: seed.messageIsPrivate,
      donorMessage: seed.donorMessage,
      blockId: seed.blockId,
    },
  });
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 12);
  const pinHash = await bcrypt.hash("1234", 12);

  // ── Sellers ──────────────────────────────────────────────────────────────
  const sellerA = await prisma.seller.upsert({
    where: { email: "seller-a@test.cagnottes.sn" },
    update: {
      password: passwordHash,
      kycStatus: "APPROVED",
      withdrawalPinHash: pinHash,
      emailVerified: true,
      onboardingCompleted: true,
    },
    create: {
      slug: "test-seller-a",
      email: "seller-a@test.cagnottes.sn",
      password: passwordHash,
      displayName: "Seller A (KYC Approuvé)",
      emailVerified: true,
      kycStatus: "APPROVED",
      kycFullName: "Aïda Diop",
      kycReviewedAt: new Date(),
      kycSubmittedAt: new Date(),
      withdrawalPinHash: pinHash,
      onboardingCompleted: true,
      payoutPhone: "+221770000001",
      payoutProvider: "wave_money",
      payoutName: "Aïda Diop",
      payoutCountry: "SN",
      plan: "FREE",
    },
    select: { id: true, slug: true },
  });

  const sellerB = await prisma.seller.upsert({
    where: { email: "seller-b@test.cagnottes.sn" },
    update: {
      password: passwordHash,
      kycStatus: "NONE",
      withdrawalPinHash: null,
      emailVerified: true,
      onboardingCompleted: true,
    },
    create: {
      slug: "test-seller-b",
      email: "seller-b@test.cagnottes.sn",
      password: passwordHash,
      displayName: "Seller B (KYC En Attente)",
      emailVerified: true,
      kycStatus: "NONE",
      onboardingCompleted: true,
      plan: "FREE",
    },
    select: { id: true, slug: true },
  });

  console.log(`✓ Sellers: ${sellerA.slug}, ${sellerB.slug}`);

  // ── Cagnottes (4 blocks) ─────────────────────────────────────────────────
  const now = Date.now();
  const in30d = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  const in60d = new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString();

  const c1 = await upsertBlock({
    slug: "anniversaire-de-fatou",
    sellerId: sellerA.id,
    title: "Anniversaire de Fatou",
    position: 0,
    config: {
      subtype: "festive",
      occasion: "anniversaire",
      title: "Anniversaire de Fatou",
      description: "Aidons à organiser un super anniversaire pour Fatou.",
      coverUrl: null,
      goalAmount: 100000,
      endDate: in30d,
      visibility: "public",
      hideAmount: false,
      hideDonors: false,
      showDonorCount: true,
      suggestedAmounts: [1000, 5000, 10000, 25000],
      checkoutFields: { name: true, email: true, phone: true, message: true },
      thankYouMessage: "Merci pour ton soutien !",
    },
  });

  const c2 = await upsertBlock({
    slug: "mariage-aissatou-moussa",
    sellerId: sellerA.id,
    title: "Mariage de Aïssatou et Moussa",
    position: 1,
    config: {
      subtype: "festive",
      occasion: "mariage",
      title: "Mariage de Aïssatou et Moussa",
      description: "Cagnotte commune pour le mariage.",
      coverUrl: null,
      goalAmount: 500000,
      endDate: in60d,
      visibility: "public",
      hideAmount: false,
      hideDonors: false,
      showDonorCount: true,
      suggestedAmounts: [5000, 10000, 25000, 50000],
      checkoutFields: { name: true, email: true, phone: true, message: true },
      thankYouMessage: "Merci infiniment !",
    },
  });

  const c3 = await upsertBlock({
    slug: "rentree-scolaire-2026",
    sellerId: sellerB.id,
    title: "Aide pour la rentrée scolaire",
    position: 0,
    config: {
      subtype: "solidaire",
      cause: "education",
      beneficiary: "Famille X",
      title: "Aide pour la rentrée scolaire",
      description: "Soutenir une famille pour la rentrée des classes.",
      coverUrl: null,
      goalAmount: 200000,
      endDate: in60d,
      visibility: "public",
      hideAmount: false,
      hideDonors: false,
      showDonorCount: true,
      suggestedAmounts: [2000, 5000, 10000, 20000],
      checkoutFields: { name: true, email: true, phone: true, message: true },
      thankYouMessage: "Merci pour ton geste solidaire.",
    },
  });

  const c4 = await upsertBlock({
    slug: "cagnotte-privee-test",
    sellerId: sellerB.id,
    title: "Cagnotte privée test",
    position: 1,
    config: {
      subtype: "solidaire",
      cause: "urgence",
      beneficiary: "Famille Y",
      title: "Cagnotte privée test",
      description: "Cagnotte test marquée privée — utilisée pour P05.",
      coverUrl: null,
      goalAmount: 50000,
      endDate: in30d,
      visibility: "private",
      hideAmount: false,
      hideDonors: false,
      showDonorCount: true,
      suggestedAmounts: [1000, 2500, 5000, 10000],
      checkoutFields: { name: true, email: true, phone: true, message: true },
      thankYouMessage: "Merci pour ta discrétion.",
    },
  });

  console.log(`✓ Cagnottes: ${c1.slug}, ${c2.slug}, ${c3.slug}, ${c4.slug}`);

  // ── 10 PAID orders ───────────────────────────────────────────────────────
  // 5 anonymous, 5 named. 3 messageIsPrivate=true, 7 public.
  const orderFixtures: Array<Omit<OrderSeed, "reference">> = [
    // Cagnotte 1 (festive Seller A) — 3 orders
    {
      blockId: c1.id, sellerId: sellerA.id, amount: 5000, subtype: "festive",
      isAnonymous: false, messageIsPrivate: false,
      customerName: "Aliou Sow", customerEmail: "aliou.sow@test.cagnottes.sn",
      donorMessage: "Bon anniversaire Fatou !",
    },
    {
      blockId: c1.id, sellerId: sellerA.id, amount: 10000, subtype: "festive",
      isAnonymous: true, messageIsPrivate: false,
      customerName: "Donor Anonyme 1", customerEmail: "anon1@test.cagnottes.sn",
      donorMessage: "Bravo !",
    },
    {
      blockId: c1.id, sellerId: sellerA.id, amount: 2500, subtype: "festive",
      isAnonymous: false, messageIsPrivate: true,
      customerName: "Awa Ndiaye", customerEmail: "awa.ndiaye@test.cagnottes.sn",
      donorMessage: "Message privé pour Fatou.",
    },
    // Cagnotte 2 (festive Seller A) — 3 orders
    {
      blockId: c2.id, sellerId: sellerA.id, amount: 25000, subtype: "festive",
      isAnonymous: false, messageIsPrivate: false,
      customerName: "Mouhamed Ba", customerEmail: "mouhamed.ba@test.cagnottes.sn",
      donorMessage: "Félicitations aux mariés !",
    },
    {
      blockId: c2.id, sellerId: sellerA.id, amount: 50000, subtype: "festive",
      isAnonymous: true, messageIsPrivate: true,
      customerName: "Donor Anonyme 2", customerEmail: "anon2@test.cagnottes.sn",
      donorMessage: "Tout le bonheur du monde.",
    },
    // Cagnotte 3 (solidaire Seller B) — 4 orders (rebalanced so each seller has 5)
    {
      blockId: c3.id, sellerId: sellerB.id, amount: 5000, subtype: "solidaire",
      isAnonymous: false, messageIsPrivate: false,
      customerName: "Ibrahima Sarr", customerEmail: "ibrahima.sarr@test.cagnottes.sn",
      donorMessage: "Bon courage à la famille.",
    },
    {
      blockId: c3.id, sellerId: sellerB.id, amount: 20000, subtype: "solidaire",
      isAnonymous: true, messageIsPrivate: false,
      customerName: "Donor Anonyme 3", customerEmail: "anon3@test.cagnottes.sn",
      donorMessage: "Solidarité.",
    },
    {
      blockId: c3.id, sellerId: sellerB.id, amount: 10000, subtype: "solidaire",
      isAnonymous: true, messageIsPrivate: true,
      customerName: "Donor Anonyme 4", customerEmail: "anon4@test.cagnottes.sn",
      donorMessage: "Message privé.",
    },
    {
      blockId: c3.id, sellerId: sellerB.id, amount: 15000, subtype: "solidaire",
      isAnonymous: false, messageIsPrivate: false,
      customerName: "Mariama Cissé", customerEmail: "mariama.cisse@test.cagnottes.sn",
      donorMessage: "Plein de force à la famille.",
    },
    // Cagnotte 4 (private solidaire Seller B) — 1 order
    {
      blockId: c4.id, sellerId: sellerB.id, amount: 5000, subtype: "solidaire",
      isAnonymous: true, messageIsPrivate: false,
      customerName: "Donor Anonyme 5", customerEmail: "anon5@test.cagnottes.sn",
      donorMessage: "Discret.",
    },
  ];

  let orderCount = 0;
  for (let i = 0; i < orderFixtures.length; i++) {
    const f = orderFixtures[i];
    const reference = `seed-${f.blockId.slice(-8)}-${i}`;
    await upsertOrder({ ...f, reference });
    orderCount++;
  }
  console.log(`✓ Orders: ${orderCount}`);

  // ── 5 notifications per seller via createNotification ────────────────────
  // Idempotent because dedupeKey is unique.
  let notifCount = 0;

  const sellerAOrders = await prisma.order.findMany({
    where: { sellerId: sellerA.id, paymentStatus: "PAID" },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { block: true },
  });
  for (const o of sellerAOrders) {
    if (!o.block) continue;
    const result = await createNotification({
      sellerId: sellerA.id,
      type: "DONATION_RECEIVED",
      dedupeKey: `donation_received:${o.id}`,
      title: `${o.isAnonymous ? "Un participant anonyme" : o.customerName || "Un participant"} a participé à ${o.block.title}`,
      body: `${o.amount} FCFA reçus`,
      icon: "heart",
      blockId: o.block.id,
      orderId: o.id,
      data: {
        donorDisplayName: o.customerName,
        wasAnonymous: o.isAnonymous,
        amount: o.amount,
      },
    });
    if (result.created) notifCount++;
  }

  const sellerBOrders = await prisma.order.findMany({
    where: { sellerId: sellerB.id, paymentStatus: "PAID" },
    orderBy: { createdAt: "asc" },
    take: 5,
    include: { block: true },
  });
  for (const o of sellerBOrders) {
    if (!o.block) continue;
    const result = await createNotification({
      sellerId: sellerB.id,
      type: "DONATION_RECEIVED",
      dedupeKey: `donation_received:${o.id}`,
      title: `${o.isAnonymous ? "Un participant anonyme" : o.customerName || "Un participant"} a participé à ${o.block.title}`,
      body: `${o.amount} FCFA reçus`,
      icon: "heart",
      blockId: o.block.id,
      orderId: o.id,
      data: {
        donorDisplayName: o.customerName,
        wasAnonymous: o.isAnonymous,
        amount: o.amount,
      },
    });
    if (result.created) notifCount++;
  }

  // Existing notifications counted via DB as well (deduped re-runs return 0 newly created)
  const totalNotifs = await prisma.notification.count({
    where: { sellerId: { in: [sellerA.id, sellerB.id] } },
  });
  console.log(`✓ Notifications: ${notifCount} créées (${totalNotifs} total en base)`);

  console.log(
    `\n✓ Seed complete: 2 sellers, 4 cagnottes, ${orderCount} orders, ${totalNotifs} notifications`,
  );
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isReset = process.argv.includes("--reset");
  try {
    if (isReset) {
      await reset();
    } else {
      await seed();
    }
  } finally {
    await prisma.$disconnect();
  }
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
