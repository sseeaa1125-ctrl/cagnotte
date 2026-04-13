/**
 * Seed 100 coaches avec ~10 bookings chacun dans des états variés.
 * Usage: npx tsx scripts/seed-coaches.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant");
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// ── Données réalistes ──

const PRENOMS = [
  "Awa", "Fatou", "Aminata", "Mariama", "Aïssatou", "Oumy", "Ndèye", "Khady", "Dieynaba", "Sokhna",
  "Ibrahima", "Moussa", "Abdoulaye", "Cheikh", "Ousmane", "Mamadou", "Modou", "Pape", "Amadou", "Aliou",
  "Binta", "Coumba", "Rama", "Astou", "Yacine", "Seynabou", "Ndeye", "Mame", "Diary", "Rokhy",
  "Malick", "Bassirou", "Saliou", "Babacar", "Lamine", "Demba", "El Hadji", "Serigne", "Thierno", "Alioune",
  "Adja", "Mareme", "Arame", "Kiné", "Dado", "Nabou", "Codou", "Anta", "Saly", "Nafi",
];

const NOMS = [
  "Diop", "Ndiaye", "Fall", "Sow", "Ba", "Sy", "Gueye", "Mbaye", "Sarr", "Diallo",
  "Kane", "Diouf", "Niang", "Thiam", "Faye", "Cissé", "Touré", "Bâ", "Dia", "Ly",
];

const SPECIALITES = [
  "Fitness", "Yoga", "Nutrition", "Développement personnel", "Business Coaching",
  "Marketing Digital", "Photographie", "Musique", "Design", "Langues",
  "Comptabilité", "Droit", "Méditation", "Pilates", "CrossFit",
  "Natation", "Running", "Boxe", "Danse", "Art thérapie",
];

const VILLES = [
  "Dakar", "Abidjan", "Bamako", "Ouagadougou", "Conakry",
  "Lomé", "Cotonou", "Niamey", "Nouakchott", "Thiès",
];

const LIEUX = [
  "Studio Almadies", "Centre Plateau", "Salle Mermoz", "Espace Sacré-Cœur",
  "Local Ngor", "Gym Point E", "Centre Fann", "Salle Liberté 6",
  "En ligne", "Google Meet",
];

const SERVICES = [
  "Coaching privé 1h", "Consultation 45min", "Session découverte 30min",
  "Accompagnement premium 90min", "Bilan personnalisé 1h", "Atelier groupe 2h",
  "Mentorat 1h", "Audit express 30min", "Formation individuelle 1h30",
  "Suivi hebdomadaire 45min",
];

const OPERATORS = ["wave_money", "orange_money"];

const PAYMENT_STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED", "EXPIRED"] as const;

// Distribution réaliste des statuts (sur 10 bookings)
// ~5 PAID, ~2 PENDING, ~1 FAILED, ~1 REFUNDED, ~1 EXPIRED
const STATUS_DISTRIBUTION: (typeof PAYMENT_STATUSES[number])[] = [
  "PAID", "PAID", "PAID", "PAID", "PAID",
  "PENDING", "PENDING",
  "FAILED",
  "REFUNDED",
  "EXPIRED",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomPhone(): string {
  const prefix = "+221" + (Math.random() > 0.5 ? "77" : "78");
  const digits = String(Math.floor(Math.random() * 10000000)).padStart(7, "0");
  return prefix + digits;
}

function randomPrice(): number {
  const prices = [5000, 7500, 10000, 15000, 20000, 25000, 30000, 50000];
  return pick(prices);
}

function randomDate(daysBack: number, daysForward: number = 0): Date {
  const now = Date.now();
  const from = now - daysBack * 86400000;
  const to = now + daysForward * 86400000;
  return new Date(from + Math.random() * (to - from));
}

function generateReference(): string {
  return "IZY-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const hashedPassword = await bcrypt.hash("coach123", 12);
  const NUM_COACHES = 100;
  const usedSlugs = new Set<string>();
  const usedEmails = new Set<string>();

  console.log(`\n🏋️ Création de ${NUM_COACHES} coaches avec bookings...\n`);

  for (let i = 0; i < NUM_COACHES; i++) {
    const prenom = pick(PRENOMS);
    const nom = pick(NOMS);
    const specialite = pick(SPECIALITES);
    const ville = pick(VILLES);
    const displayName = `${prenom} ${nom}`;

    // Slug unique
    let baseSlug = slugify(`${prenom}-${nom}`);
    let slug = baseSlug;
    let attempt = 0;
    while (usedSlugs.has(slug)) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }
    usedSlugs.add(slug);

    // Email unique
    let email = `${slug}@coach-test.com`;
    let emailAttempt = 0;
    while (usedEmails.has(email)) {
      emailAttempt++;
      email = `${slug}-${emailAttempt}@coach-test.com`;
    }
    usedEmails.add(email);

    const phone = randomPhone();
    const plan = Math.random() > 0.3 ? "PRO" : "FREE";
    const commissionRate = plan === "PRO" ? 400 : 800; // 4% ou 8%

    // 1. Créer le seller
    const seller = await prisma.seller.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: true,
        slug,
        displayName,
        bio: `${specialite} · ${ville}`,
        phone,
        phoneCountry: "SN",
        themeId: "default",
        plan,
        payoutPhone: phone,
        payoutProvider: "wave_money",
        payoutCountry: "SN",
        payoutName: displayName,
        onboardingCompleted: true,
        kycStatus: Math.random() > 0.3 ? "APPROVED" : "PENDING",
      },
    });

    // 2. Créer un bloc BOOKING avec BookingService
    const price = randomPrice();
    const duration = pick([30, 45, 60, 90, 120]);
    const location = pick(LIEUX);
    const serviceName = pick(SERVICES);

    const block = await prisma.block.create({
      data: {
        sellerId: seller.id,
        type: "BOOKING",
        position: 0,
        config: {},
        bookingService: {
          create: {
            title: serviceName,
            description: `${serviceName} avec ${displayName} — ${specialite}`,
            price,
            duration,
            location,
            minAdvanceHours: pick([12, 24, 48]),
            slots: {
              create: [
                { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
                { dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
                { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
                { dayOfWeek: 5, startTime: "10:00", endTime: "16:00" },
              ],
            },
          },
        },
      },
      include: { bookingService: true },
    });

    const bookingServiceId = block.bookingService!.id;

    // 3. Créer ~10 bookings avec états variés
    const numBookings = 8 + Math.floor(Math.random() * 5); // 8-12
    const statuses = [...STATUS_DISTRIBUTION];
    // Ajouter des statuts supplémentaires si > 10 bookings
    while (statuses.length < numBookings) {
      statuses.push(pick(["PAID", "PENDING", "PAID"]));
    }
    // Mélanger
    statuses.sort(() => Math.random() - 0.5);

    for (let j = 0; j < numBookings; j++) {
      const status = statuses[j];
      const operator = pick(OPERATORS);
      const customerPrenom = pick(PRENOMS);
      const customerNom = pick(NOMS);
      const customerEmail = `${slugify(customerPrenom)}.${slugify(customerNom)}${Math.floor(Math.random() * 999)}@gmail.com`;
      const customerPhone = randomPhone();
      const customerName = `${customerPrenom} ${customerNom}`;

      const bookingDate = randomDate(30, 60); // Entre -30j et +60j
      const createdAt = new Date(bookingDate.getTime() - (24 + Math.random() * 72) * 3600000); // Créé 1-4j avant le RDV

      const commissionAmount = Math.round(price * commissionRate / 10000);
      const sellerAmount = price - commissionAmount;

      const reference = generateReference();

      const orderData: Record<string, unknown> = {
        reference,
        sellerId: seller.id,
        orderType: "BOOKING",
        amount: price,
        currency: "XOF",
        commissionRate,
        commissionAmount,
        sellerAmount,
        paymentStatus: status,
        paymentProvider: "bictorys",
        paymentOperator: operator,
        paymentExternalId: status !== "PENDING" ? `bic_${crypto.randomBytes(8).toString("hex")}` : null,
        customerEmail,
        customerName,
        customerPhone,
        bookingServiceId,
        bookingDate,
        bookingDuration: duration,
        bookingLocation: location,
        createdAt,
        source: pick(["direct", "instagram", "whatsapp", "link", null]),
        country: "SN",
      };

      // Champs spécifiques selon le statut
      if (status === "PAID") {
        orderData.paidAt = new Date(createdAt.getTime() + Math.random() * 600000); // Payé 0-10min après
        // Quelques-uns avec un lien Meet
        if (Math.random() > 0.6) {
          orderData.meetingUrl = `https://meet.google.com/${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(3).toString("hex")}`;
        }
      }

      if (status === "REFUNDED") {
        orderData.paidAt = new Date(createdAt.getTime() + Math.random() * 600000);
        orderData.refundedAt = new Date(createdAt.getTime() + (1 + Math.random() * 48) * 3600000); // Remboursé 1-48h après
        orderData.refundReference = `refund_${crypto.randomBytes(8).toString("hex")}`;
        orderData.refundBictorysId = `bic_ref_${crypto.randomBytes(8).toString("hex")}`;
      }

      if (status === "FAILED") {
        // Parfois cancelled
        if (Math.random() > 0.5) {
          orderData.bookingCancelled = true;
          orderData.bookingCancelledAt = new Date(createdAt.getTime() + Math.random() * 86400000);
        }
      }

      if (status === "EXPIRED") {
        // Commande expirée — pas de paidAt
        orderData.paymentExternalId = null;
      }

      await prisma.order.create({ data: orderData as never });
    }

    // 4. Créer des customers à partir des commandes PAID
    const paidOrders = await prisma.order.findMany({
      where: { sellerId: seller.id, paymentStatus: "PAID" },
      select: { customerEmail: true, customerName: true, customerPhone: true, amount: true },
    });

    const seenEmails = new Set<string>();
    for (const o of paidOrders) {
      if (seenEmails.has(o.customerEmail)) continue;
      seenEmails.add(o.customerEmail);

      await prisma.customer.create({
        data: {
          sellerId: seller.id,
          email: o.customerEmail,
          name: o.customerName,
          phone: o.customerPhone,
          totalSpent: o.amount,
          orderCount: 1,
        },
      });
    }

    const statusCounts: Record<string, number> = {};
    statuses.slice(0, numBookings).forEach((s) => {
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const statusSummary = Object.entries(statusCounts)
      .map(([s, c]) => `${c}×${s}`)
      .join(", ");

    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`  ✅ ${i + 1}/${NUM_COACHES} — ${displayName} (@${slug}) — ${numBookings} bookings [${statusSummary}]`);
    }
  }

  // Stats finales
  const totalSellers = await prisma.seller.count({ where: { email: { endsWith: "@coach-test.com" } } });
  const totalOrders = await prisma.order.count({ where: { seller: { email: { endsWith: "@coach-test.com" } } } });
  const statusAgg = await prisma.order.groupBy({
    by: ["paymentStatus"],
    where: { seller: { email: { endsWith: "@coach-test.com" } } },
    _count: true,
  });

  console.log(`\n🎉 Seed terminé !`);
  console.log(`   📊 ${totalSellers} coaches créés`);
  console.log(`   📋 ${totalOrders} bookings au total`);
  console.log(`   📈 Répartition :`);
  for (const s of statusAgg) {
    console.log(`      ${s.paymentStatus}: ${s._count}`);
  }
  console.log(`\n   🔑 Mot de passe pour tous : coach123`);
  console.log(`   📧 Emails : {slug}@coach-test.com\n`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
