/**
 * Réconciliation manuelle des commandes marquées FAILED à tort par le bug
 * "webhook Bictorys amount=null" (avril 2026).
 *
 * Contexte : Bictorys a changé le format de ses webhooks — `amount` peut
 * arriver à null. L'ancien check `if (amount !== order.amount)` marquait
 * TOUTES les commandes comme FAILED (null !== 5000). Le paiement était
 * pourtant débité côté Wave/Orange Money. Voir audit-012 pour la chronologie.
 *
 * L'API Bictorys GET /charges/{id} renvoie aussi null pour le montant, donc
 * la réconciliation automatique n'est pas fiable : il faut croiser le
 * dashboard Bictorys ("Paiement reçu") avant de marquer PAID.
 *
 * Usage :
 *   cd backend
 *   # 1. Lister les candidats des 7 derniers jours (défaut)
 *   npx tsx scripts/reconcile-bictorys.ts list
 *   npx tsx scripts/reconcile-bictorys.ts list --days=14
 *
 *   # 2. Après vérif dashboard Bictorys → flip en PAID + stats + notifications
 *   npx tsx scripts/reconcile-bictorys.ts paid CAG-xxxxx
 *   npx tsx scripts/reconcile-bictorys.ts paid CAG-xxxxx --dry      # simulation
 *
 * Dev-only — jamais contre la production sans dry-run préalable.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  fireDonationReceived,
  fireMilestone,
  fireDonationMessage,
  type OrderForDispatch,
  type BlockForDispatch,
} from "../src/lib/notifications/dispatch.js";
import { detectCrossed } from "../src/lib/notifications/milestones.js";

function parseDays(argv: string[]): number {
  const flag = argv.find((a) => a.startsWith("--days="));
  if (!flag) return 7;
  const n = parseInt(flag.split("=")[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

async function listCandidates(days: number): Promise<void> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "FAILED",
      paymentExternalId: { not: null },
      createdAt: { gte: since },
    },
    select: {
      reference: true,
      paymentExternalId: true,
      amount: true,
      currency: true,
      customerEmail: true,
      customerPhone: true,
      orderType: true,
      createdAt: true,
      seller: { select: { slug: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    console.log(`Aucune commande FAILED avec paymentExternalId sur les ${days} derniers jours.`);
    return;
  }

  console.log(`${orders.length} commande(s) FAILED candidates à réconcilier (${days}j) :\n`);
  console.log(
    "ref".padEnd(22),
    "providerId".padEnd(30),
    "amount".padEnd(10),
    "seller".padEnd(20),
    "type".padEnd(9),
    "createdAt",
  );
  console.log("─".repeat(120));
  for (const o of orders) {
    console.log(
      o.reference.padEnd(22),
      (o.paymentExternalId ?? "").padEnd(30),
      `${o.amount}`.padEnd(10),
      (o.seller?.slug ?? "—").padEnd(20),
      o.orderType.padEnd(9),
      o.createdAt.toISOString().slice(0, 19),
    );
  }
  console.log(
    "\nÉtapes suivantes : vérifie chaque providerId sur le dashboard Bictorys.",
  );
  console.log(
    'Pour celles marquées "Paiement reçu" côté Bictorys :',
  );
  console.log('  npx tsx scripts/reconcile-bictorys.ts paid <ref>');
}

async function reconcilePaid(ref: string, dry: boolean): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { reference: ref },
    include: { block: true },
  });
  if (!order) {
    console.error(`Commande introuvable : ${ref}`);
    process.exit(1);
  }

  if (order.paymentStatus === "PAID") {
    console.log(`Commande ${ref} est déjà PAID — rien à faire.`);
    return;
  }
  if (order.paymentStatus !== "FAILED") {
    console.error(
      `Refus : paymentStatus=${order.paymentStatus} (attendu FAILED). ` +
        `Ce script ne traite que les FAILED → PAID pour le bug webhook amount=null.`,
    );
    process.exit(1);
  }
  if (!order.paymentExternalId) {
    console.error(
      `Refus : ${ref} n'a pas de paymentExternalId. Sans transaction Bictorys, ` +
        `on ne peut pas dedup un futur webhook. Réconciliation impossible.`,
    );
    process.exit(1);
  }

  const actor = process.env.USER || "unknown";
  const ts = new Date().toISOString();

  if (dry) {
    console.log(`[DRY] [${ts}] [actor=${actor}] Flip ${ref} → PAID`);
    console.log(`[DRY]   amount=${order.amount} voluntaryContribution=${order.voluntaryContribution ?? 0}`);
    console.log(`[DRY]   sellerId=${order.sellerId} blockId=${order.blockId ?? "—"} type=${order.orderType}`);
    console.log(`[DRY]   customerEmail=${order.customerEmail}`);
    console.log(`[DRY]   Notifications qui seraient fired : donation_received${order.donorMessage ? " + donation_message" : ""}${order.blockId ? " + milestones éventuels" : ""}`);
    return;
  }

  type TxResult =
    | { skipped: true; reason: string }
    | {
        skipped: false;
        prevTotal: number;
        newTotal: number;
        blk: BlockForDispatch | null;
        ord: OrderForDispatch;
      };

  const result = await prisma.$transaction<TxResult>(
    async (tx) => {
      // Ré-upsert du webhookLog sur eventType="succeeded" pour bloquer toute
      // future re-livraison webhook Bictorys (same protection qu'un webhook live).
      const log = await tx.webhookLog.upsert({
        where: {
          externalId_eventType: {
            externalId: order.paymentExternalId!,
            eventType: "succeeded",
          },
        },
        create: {
          provider: "bictorys",
          eventType: "succeeded",
          externalId: order.paymentExternalId!,
          payload: { source: "manual_reconcile", actor, ref, at: ts },
          status: "processed",
        },
        update: { status: "processed" },
      });

      // Re-check in-tx : si un webhook a flippé la commande entre le list et
      // le paid, on bail.
      const fresh = await tx.order.findUnique({
        where: { id: order.id },
        include: { block: true },
      });
      if (!fresh) return { skipped: true, reason: "fresh order null" };
      if (fresh.paymentStatus === "PAID") {
        return { skipped: true, reason: "already PAID" };
      }

      let prevTotal = 0;
      if (fresh.blockId) {
        const agg = await tx.order.aggregate({
          where: { blockId: fresh.blockId, paymentStatus: "PAID", id: { not: fresh.id } },
          _sum: { amount: true, voluntaryContribution: true },
        });
        prevTotal = (agg._sum.amount ?? 0) - (agg._sum.voluntaryContribution ?? 0);
      }

      await tx.order.update({
        where: { id: fresh.id },
        data: {
          paymentStatus: "PAID",
          paidAt: new Date(),
          // paymentExternalId est déjà set (écrit par le webhook FAILED)
        },
      });

      // Customer totals — le FAILED path n'avait pas incrémenté ces champs,
      // donc on les rattrape maintenant.
      await tx.customer.updateMany({
        where: { sellerId: fresh.sellerId, email: fresh.customerEmail },
        data: {
          totalSpent: { increment: fresh.amount },
          orderCount: { increment: 1 },
        },
      });

      // Product totals pour la branche SALE (legacy fork)
      if (fresh.orderType === "SALE" && fresh.productId) {
        await tx.product.update({
          where: { id: fresh.productId },
          data: {
            totalSales: { increment: 1 },
            totalRevenue: { increment: fresh.amount },
          },
        });
      }

      // Marquer le log processed (l'upsert ci-dessus l'a déjà fait mais on
      // reste explicite pour la lisibilité)
      await tx.webhookLog.update({
        where: { id: log.id },
        data: { status: "processed" },
      });

      const ordForDispatch: OrderForDispatch = {
        id: fresh.id,
        amount: fresh.amount,
        voluntaryContribution: fresh.voluntaryContribution ?? 0,
        customerName: fresh.customerName,
        isAnonymous: fresh.isAnonymous,
        donorMessage: fresh.donorMessage,
        messageIsPrivate: fresh.messageIsPrivate,
      };
      const blkForDispatch: BlockForDispatch | null = fresh.block
        ? {
            id: fresh.block.id,
            sellerId: fresh.block.sellerId,
            title: fresh.block.title,
            config: fresh.block.config,
          }
        : null;

      return {
        skipped: false,
        prevTotal,
        newTotal: prevTotal + (fresh.amount - (fresh.voluntaryContribution ?? 0)),
        blk: blkForDispatch,
        ord: ordForDispatch,
      };
    },
    { isolationLevel: "Serializable" },
  );

  if (result.skipped) {
    console.log(`[${ts}] [actor=${actor}] Skip ${ref} — ${result.reason}`);
    return;
  }

  // Dispatch post-tx — le dedupeKey Notification (@unique) protège
  // naturellement contre un double-fire si le vrai webhook arrive ensuite.
  if (result.blk) {
    const blk = result.blk;
    const ord = result.ord;

    const donationRes = await fireDonationReceived(ord, blk).catch((err) => {
      console.error("[notif] fireDonationReceived error", err);
      return null;
    });

    const goalAmount = ((blk.config as { goalAmount?: number } | null) ?? {}).goalAmount ?? 0;
    const crossed = detectCrossed(result.prevTotal, result.newTotal, goalAmount);
    for (const t of crossed) {
      await fireMilestone(blk, t).catch((err) =>
        console.error(`[notif] fireMilestone ${t} error`, err),
      );
    }

    if (ord.donorMessage && ord.donorMessage.trim().length > 0) {
      await fireDonationMessage(ord, blk).catch((err) =>
        console.error("[notif] fireDonationMessage error", err),
      );
    }

    console.log(
      `[${ts}] [actor=${actor}] ✓ ${ref} : FAILED → PAID. ` +
        `amount=${ord.amount} block=${blk.id} prevTotal=${result.prevTotal} newTotal=${result.newTotal}. ` +
        `Notif donation_received: ${donationRes?.created ? "fired" : "deduped"}.`,
    );
  } else {
    console.log(
      `[${ts}] [actor=${actor}] ✓ ${ref} : FAILED → PAID (pas de block, legacy order — aucune notification).`,
    );
  }
}

async function main(): Promise<void> {
  const [, , cmd, arg, ...rest] = process.argv;
  const argv = [arg, ...rest].filter((x): x is string => !!x);

  if (!cmd || cmd === "list") {
    await listCandidates(parseDays(argv));
  } else if (cmd === "paid") {
    if (!arg || arg.startsWith("--")) {
      console.error("Usage: tsx scripts/reconcile-bictorys.ts paid <ref> [--dry]");
      process.exit(1);
    }
    const dry = argv.includes("--dry");
    await reconcilePaid(arg, dry);
  } else {
    console.error(
      "Usage:\n" +
        "  tsx scripts/reconcile-bictorys.ts list [--days=N]\n" +
        "  tsx scripts/reconcile-bictorys.ts paid <ref> [--dry]",
    );
    process.exit(1);
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
