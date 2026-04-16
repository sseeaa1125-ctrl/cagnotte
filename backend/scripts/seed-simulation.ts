/**
 * Simulation — 100 utilisateurs, cagnottes, dons et messages sur 30 jours.
 *
 * Crée des données réalistes avec noms sénégalais, montants FCFA, messages
 * en français, et timestamps antidatés. Utilise Prisma direct (pas d'API).
 *
 * Usage:
 *   cd backend && npx tsx scripts/seed-simulation.ts          # seed
 *   cd backend && npx tsx scripts/seed-simulation.ts --reset  # delete fixtures
 *
 * Namespace: email @sim.cagnottes.sn, slug prefix sim-
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { computeCommission } from "../src/lib/commission.js";
import { createNotification } from "../src/lib/notifications/index.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const NUM_SELLERS = 100;
const DAYS = 30;
const EMAIL_DOMAIN = "@sim.cagnottes.sn";
const SLUG_PREFIX = "sim-";
const PASSWORD = "password123";

// Realistic Senegalese names
const PRENOMS = [
  "Amadou", "Fatou", "Moussa", "Aïssatou", "Ibrahima", "Mariama", "Ousmane",
  "Aminata", "Mamadou", "Khady", "Abdoulaye", "Coumba", "Cheikh", "Ndèye",
  "Modou", "Awa", "Aliou", "Dieynaba", "Babacar", "Sokhna", "Pape", "Rama",
  "Serigne", "Binta", "Lamine", "Adja", "Malick", "Rokhaya", "Moustapha",
  "Aïda", "Demba", "Mame", "Saliou", "Yacine", "Pathé", "Nafi", "Djibril",
  "Seynabou", "Habib", "Daba", "Omar", "Astou", "Thierno", "Diarra",
  "Assane", "Oumou", "Samba", "Maguette", "El Hadji", "Khadija",
];

const NOMS = [
  "Diop", "Fall", "Ndiaye", "Sow", "Ba", "Diallo", "Sy", "Sarr", "Cissé",
  "Mbaye", "Gueye", "Kane", "Diouf", "Niang", "Thiam", "Faye", "Seck",
  "Tall", "Mbow", "Wade", "Touré", "Dieng", "Camara", "Mboup", "Ndoye",
  "Samb", "Guèye", "Ly", "Sané", "Dramé", "Kanté", "Soumaré", "Mané",
  "Badji", "Dème", "Dia", "Konaté", "Bâ", "Thiaw", "Mendy",
];

const OCCASIONS_FESTIVE = [
  "anniversaire", "mariage", "bapteme", "remise-diplome", "fete",
  "naissance", "fiancailles", "pot-depart",
];

const CAUSES_SOLIDAIRE = [
  "sante", "education", "urgence", "logement", "deuil",
  "catastrophe", "projet-communautaire", "formation",
];

const TITRES_FESTIVE = [
  "Anniversaire de {name}",
  "Mariage de {name} et {name2}",
  "Baptême du petit {name}",
  "Cagnotte surprise pour {name}",
  "Pot de départ de {name}",
  "Fête de remise de diplôme de {name}",
  "Fiançailles de {name}",
  "Baby shower de {name}",
  "Cadeau commun pour {name}",
  "Fête de bienvenue pour {name}",
];

const TITRES_SOLIDAIRE = [
  "Soutien médical pour {name}",
  "Aide scolaire pour la famille {nom}",
  "Urgence familiale — {name} a besoin de nous",
  "Reconstruction après l'incendie chez {name}",
  "Aide au loyer pour {name}",
  "Funérailles de {name}",
  "Projet communautaire quartier {nom}",
  "Formation professionnelle pour {name}",
  "Solidarité pour la famille {nom}",
  "Opération chirurgicale de {name}",
];

const DESCRIPTIONS_FESTIVE = [
  "Participons tous ensemble pour offrir un moment inoubliable ! Chaque contribution compte.",
  "Une belle occasion de se retrouver et de célébrer. Ta participation fera la différence !",
  "On organise une surprise collective. Contribue ce que tu peux, le geste compte plus que le montant.",
  "Aidons à rendre cette journée magique. Toute participation est la bienvenue.",
  "Ensemble, faisons de cet événement un souvenir mémorable pour toute la famille.",
];

const DESCRIPTIONS_SOLIDAIRE = [
  "La famille traverse une période difficile et a besoin de notre soutien. Chaque franc compte.",
  "Situation urgente — mobilisons-nous rapidement. Le moindre geste fait la différence.",
  "Ensemble nous sommes plus forts. Aidons cette famille à traverser cette épreuve.",
  "Un coup dur peut arriver à n'importe qui. Aujourd'hui c'est à nous de montrer notre solidarité.",
  "Soutenons cette cause importante. La communauté a toujours su se mobiliser quand ça compte.",
];

const MESSAGES_DONORS = [
  "Bon courage !", "On est avec toi !", "Force et courage.",
  "Allah y sahhal.", "Que Dieu vous aide.", "Toutes mes pensées.",
  "Félicitations !", "Bravo à toute la famille.", "Avec tout mon soutien.",
  "Petit geste mais grand cœur.", "Solidarité toujours !",
  "On pense fort à vous.", "Bonne continuation.", "Que du bonheur !",
  "Avec amour.", "La communauté est là.", "Tiens bon.",
  "Inchallah tout ira bien.", "Belle initiative !", "Jërëjëf !",
  "Nanga def ! On est tous derrière toi.", "Bisous à toute la famille.",
  "Dieuredieuf.", "Que la paix soit avec vous.",
  "Barka ! On se mobilise.", "Waw waw, on gère ça ensemble.",
  null, null, null, null, null, // ~17% no message
];

const PHONES_PREFIXES = ["+22177", "+22178", "+22176", "+22170"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysAgo: number): Date {
  const now = Date.now();
  const offset = Math.random() * daysAgo * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function genPhone(): string {
  return pick(PHONES_PREFIXES) + String(randInt(1000000, 9999999));
}

function genPrenom(): string { return pick(PRENOMS); }
function genNom(): string { return pick(NOMS); }
function genFullName(): string { return `${genPrenom()} ${genNom()}`; }

function genTitle(subtype: "festive" | "solidaire"): string {
  const templates = subtype === "festive" ? TITRES_FESTIVE : TITRES_SOLIDAIRE;
  return pick(templates)
    .replace("{name}", genPrenom())
    .replace("{name2}", genPrenom())
    .replace("{nom}", genNom());
}

/** Round amount to nearest 500 FCFA (realistic denominations) */
function roundFCFA(amount: number): number {
  return Math.max(500, Math.round(amount / 500) * 500);
}

// ─── Reset ───────────────────────────────────────────────────────────────────

async function reset(): Promise<void> {
  const sellers = await prisma.seller.findMany({
    where: { email: { endsWith: EMAIL_DOMAIN } },
    select: { id: true },
  });
  const ids = sellers.map((s) => s.id);

  if (ids.length === 0) {
    console.log("✓ Reset: aucune fixture sim à supprimer.");
    return;
  }

  console.log(`Suppression de ${ids.length} sellers sim et données associées...`);
  await prisma.notification.deleteMany({ where: { sellerId: { in: ids } } });
  await prisma.order.deleteMany({ where: { sellerId: { in: ids } } });
  await prisma.customer.deleteMany({ where: { sellerId: { in: ids } } });
  await prisma.block.deleteMany({ where: { sellerId: { in: ids } } });
  await prisma.seller.deleteMany({ where: { id: { in: ids } } });
  console.log(`✓ Reset: ${ids.length} seller(s) sim supprimés.`);
}

// ─── Main simulation ────────────────────────────────────────────────────────

async function simulate(): Promise<void> {
  const t0 = Date.now();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log(`\n🎲 Simulation: ${NUM_SELLERS} users × ~30 jours\n`);

  // ── 1. Create 100 sellers ──────────────────────────────────────────────
  console.log("1/4  Création des sellers...");

  interface SellerRef { id: string; slug: string; displayName: string }
  const sellers: SellerRef[] = [];

  // Generate unique names
  const usedSlugs = new Set<string>();

  for (let i = 0; i < NUM_SELLERS; i++) {
    const prenom = genPrenom();
    const nom = genNom();
    const displayName = `${prenom} ${nom}`;
    let baseSlug = `${SLUG_PREFIX}${slugify(displayName)}`;
    // Ensure unique
    while (usedSlugs.has(baseSlug)) {
      baseSlug = `${baseSlug}-${randInt(1, 999)}`;
    }
    usedSlugs.add(baseSlug);

    const email = `${baseSlug}${EMAIL_DOMAIN}`;
    const kycStatus = Math.random() < 0.7 ? "APPROVED" : "NONE";

    const seller = await prisma.seller.upsert({
      where: { email },
      update: {},
      create: {
        slug: baseSlug,
        email,
        password: passwordHash,
        displayName,
        emailVerified: true,
        kycStatus,
        onboardingCompleted: true,
        ...(kycStatus === "APPROVED" && {
          kycFullName: displayName,
          kycReviewedAt: randDate(DAYS),
          kycSubmittedAt: randDate(DAYS),
          payoutPhone: genPhone(),
          payoutProvider: pick(["wave_money", "orange_money"]),
          payoutName: displayName,
          payoutCountry: "SN",
        }),
        plan: "FREE",
      },
      select: { id: true, slug: true, displayName: true },
    });
    sellers.push(seller);
  }
  console.log(`   ✓ ${sellers.length} sellers créés`);

  // ── 2. Create cagnottes (1-3 per seller) ───────────────────────────────
  console.log("2/4  Création des cagnottes...");

  interface CagnotteRef {
    id: string;
    slug: string;
    sellerId: string;
    sellerName: string;
    subtype: "festive" | "solidaire";
    goalAmount: number;
    title: string;
  }
  const cagnottes: CagnotteRef[] = [];
  const usedCagnotteSlugs = new Set<string>();

  for (const seller of sellers) {
    const numCagnottes = randInt(1, 3);
    for (let j = 0; j < numCagnottes; j++) {
      const subtype: "festive" | "solidaire" = Math.random() < 0.55 ? "festive" : "solidaire";
      const title = genTitle(subtype);
      let slug = slugify(title);
      // Ensure unique
      while (usedCagnotteSlugs.has(slug)) {
        slug = `${slug}-${randInt(1, 9999)}`;
      }
      usedCagnotteSlugs.add(slug);

      const goalAmount = subtype === "festive"
        ? roundFCFA(randInt(50000, 2000000))
        : roundFCFA(randInt(25000, 5000000));

      // End date: between 5 and 45 days from now
      const endDate = new Date(Date.now() + randInt(5, 45) * 24 * 60 * 60 * 1000);
      // Created date: between 30 and 5 days ago
      const createdAt = randDate(DAYS);

      const descriptions = subtype === "festive" ? DESCRIPTIONS_FESTIVE : DESCRIPTIONS_SOLIDAIRE;
      const occasions = subtype === "festive" ? OCCASIONS_FESTIVE : CAUSES_SOLIDAIRE;

      const visibility = Math.random() < 0.9 ? "public" : "private";
      const suggestedAmounts = subtype === "festive"
        ? pickN([1000, 2000, 3000, 5000, 10000, 15000, 25000], 3).sort((a, b) => a - b)
        : pickN([500, 1000, 2000, 5000, 10000, 20000, 50000], 3).sort((a, b) => a - b);

      const existing = await prisma.block.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        cagnottes.push({
          id: existing.id,
          slug,
          sellerId: seller.id,
          sellerName: seller.displayName,
          subtype,
          goalAmount,
          title,
        });
        continue;
      }

      const block = await prisma.block.create({
        data: {
          sellerId: seller.id,
          type: "FUNDRAISER",
          title,
          position: j,
          isActive: true,
          slug,
          createdAt,
          config: {
            subtype,
            ...(subtype === "festive" ? { occasion: pick(occasions) } : { cause: pick(occasions) }),
            title,
            description: pick(descriptions),
            coverUrl: null,
            goalAmount,
            endDate: endDate.toISOString().split("T")[0],
            visibility,
            status: "active",
            hideAmount: Math.random() < 0.05,
            hideDonors: Math.random() < 0.05,
            showDonorCount: true,
            suggestedAmounts,
            checkoutFields: { name: true, email: true, phone: true, message: true },
            thankYouMessage: pick([
              "Merci infiniment pour ta générosité !",
              "Jërëjëf ! Ton soutien compte énormément.",
              "Merci du fond du cœur.",
              "Barka ! Que Dieu te le rende.",
              "Merci pour ton geste, on pense à toi.",
            ]),
          } as object,
        },
        select: { id: true },
      });

      cagnottes.push({
        id: block.id,
        slug,
        sellerId: seller.id,
        sellerName: seller.displayName,
        subtype,
        goalAmount,
        title,
      });
    }
  }
  console.log(`   ✓ ${cagnottes.length} cagnottes créées`);

  // ── 3. Create donations (5-50 per cagnotte, spread over 30 days) ───────
  console.log("3/4  Génération des dons (peut prendre 30-60s)...");

  let totalOrders = 0;
  let totalAmount = 0;
  const orderBatch: Array<{
    reference: string;
    sellerId: string;
    blockId: string;
    amount: number;
    commissionRate: number;
    commissionAmount: number;
    sellerAmount: number;
    customerEmail: string;
    customerName: string | null;
    customerPhone: string;
    isAnonymous: boolean;
    messageIsPrivate: boolean;
    donorMessage: string | null;
    paidAt: Date;
    createdAt: Date;
  }> = [];

  for (const cag of cagnottes) {
    // More popular cagnottes get more donations (power law distribution)
    const popularity = Math.random();
    const numDonations = popularity < 0.1
      ? randInt(30, 50)    // 10% viral
      : popularity < 0.4
        ? randInt(10, 30)  // 30% popular
        : randInt(3, 10);  // 60% normal

    for (let d = 0; d < numDonations; d++) {
      const donorName = genFullName();
      const isAnonymous = Math.random() < 0.3;
      const messageIsPrivate = Math.random() < 0.15;
      const donorMessage = pick(MESSAGES_DONORS);

      // Amount distribution: mostly small, some large (realistic)
      const amountRoll = Math.random();
      let amount: number;
      if (amountRoll < 0.4) {
        amount = roundFCFA(randInt(500, 2000));       // 40% micro (500-2000)
      } else if (amountRoll < 0.75) {
        amount = roundFCFA(randInt(2000, 10000));     // 35% small (2k-10k)
      } else if (amountRoll < 0.92) {
        amount = roundFCFA(randInt(10000, 50000));    // 17% medium (10k-50k)
      } else {
        amount = roundFCFA(randInt(50000, 200000));   // 8% large (50k-200k)
      }

      const { rate, commission, net } = computeCommission(amount, cag.subtype);
      const paidAt = randDate(DAYS);
      const refId = `SIM-${totalOrders.toString().padStart(5, "0")}`;
      const donorSlug = slugify(donorName);

      orderBatch.push({
        reference: refId,
        sellerId: cag.sellerId,
        blockId: cag.id,
        amount,
        commissionRate: rate,
        commissionAmount: commission,
        sellerAmount: net,
        customerEmail: `${donorSlug}-${totalOrders}${EMAIL_DOMAIN}`,
        customerName: isAnonymous ? null : donorName,
        customerPhone: genPhone(),
        isAnonymous,
        messageIsPrivate,
        donorMessage,
        paidAt,
        createdAt: paidAt,
      });

      totalOrders++;
      totalAmount += amount;
    }
  }

  // Batch insert orders in chunks of 200 (Prisma createMany is faster)
  const CHUNK = 200;
  for (let i = 0; i < orderBatch.length; i += CHUNK) {
    const chunk = orderBatch.slice(i, i + CHUNK);
    await prisma.order.createMany({
      data: chunk.map((o) => ({
        reference: o.reference,
        sellerId: o.sellerId,
        orderType: "DONATION" as const,
        amount: o.amount,
        currency: "XOF",
        commissionRate: o.commissionRate,
        commissionAmount: o.commissionAmount,
        sellerAmount: o.sellerAmount,
        paymentStatus: "PAID" as const,
        paymentProvider: "sim_seed",
        paymentOperator: pick(["wave_money", "orange_money", "maxit"]),
        paidAt: o.paidAt,
        createdAt: o.createdAt,
        customerEmail: o.customerEmail,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        isAnonymous: o.isAnonymous,
        messageIsPrivate: o.messageIsPrivate,
        donorMessage: o.donorMessage,
        blockId: o.blockId,
      })),
      skipDuplicates: true,
    });
    process.stdout.write(`   ${Math.min(i + CHUNK, orderBatch.length)}/${orderBatch.length} dons\r`);
  }
  console.log(`   ✓ ${totalOrders} dons créés (${(totalAmount / 1000000).toFixed(1)}M FCFA total)`);

  // ── 4. Create notifications (1 per donation, batched) ──────────────────
  console.log("4/4  Notifications (peut prendre 1-2 min)...");

  // Only create notifications for a sample (all would be too slow with createNotification)
  // Pick ~500 recent orders to notify
  const recentOrders = await prisma.order.findMany({
    where: { paymentProvider: "sim_seed" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      sellerId: true,
      amount: true,
      customerName: true,
      isAnonymous: true,
      createdAt: true,
      block: { select: { id: true, title: true } },
    },
  });

  let notifCreated = 0;
  for (let i = 0; i < recentOrders.length; i++) {
    const o = recentOrders[i];
    if (!o.block) continue;

    const result = await createNotification({
      sellerId: o.sellerId,
      type: "DONATION_RECEIVED",
      dedupeKey: `sim_donation:${o.id}`,
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
    if (result.created) notifCreated++;
    if ((i + 1) % 50 === 0) process.stdout.write(`   ${i + 1}/${recentOrders.length} notifs\r`);
  }
  console.log(`   ✓ ${notifCreated} notifications créées`);

  // ── Summary ────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  // Compute stats
  const topCagnottes = await prisma.order.groupBy({
    by: ["blockId"],
    where: { paymentProvider: "sim_seed", paymentStatus: "PAID" },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: "desc" } },
    take: 5,
  });

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  SIMULATION TERMINÉE en ${elapsed}s`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Sellers:        ${sellers.length}`);
  console.log(`  Cagnottes:      ${cagnottes.length}`);
  console.log(`  Dons:           ${totalOrders}`);
  console.log(`  Montant total:  ${(totalAmount / 1_000_000).toFixed(1)}M FCFA`);
  console.log(`  Notifications:  ${notifCreated}`);
  console.log(`  Don moyen:      ${Math.round(totalAmount / totalOrders)} FCFA`);
  console.log(`${"═".repeat(60)}`);

  if (topCagnottes.length > 0) {
    console.log(`\n  🏆 Top 5 cagnottes par montant collecté:`);
    for (const tc of topCagnottes) {
      const block = await prisma.block.findUnique({
        where: { id: tc.blockId! },
        select: { title: true, slug: true },
      });
      console.log(`     ${block?.title?.slice(0, 40).padEnd(40)} ${((tc._sum.amount || 0) / 1000).toFixed(0)}k FCFA (${tc._count} dons)`);
    }
  }

  console.log(`\n  Pour nettoyer: npx tsx scripts/seed-simulation.ts --reset\n`);
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isReset = process.argv.includes("--reset");
  try {
    if (isReset) {
      await reset();
    } else {
      await simulate();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch { /* */ }
  process.exit(1);
});
