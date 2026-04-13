import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import * as logger from "../lib/logger.js";

export const inboxRouter = Router();

// ── Types ──
interface InboxItem {
  id: string;
  type: "partnership" | "donation" | "payment";
  message: string;
  senderName: string | null;
  senderEmail: string;
  senderPhone: string | null;
  senderCompany: string | null;
  blockTitle: string | null;
  budget: string | null;
  amount: number | null;
  partnershipStatus: string | null;
  read: boolean;
  archived: boolean;
  date: string;
  isTest: boolean;
}

// Filtre non-null ET non-vide pour les champs message
function nonEmptyString() {
  return { not: null, notIn: [""] } as { not: null; notIn: string[] };
}

const VALID_FILTERS = ["all", "partnership", "donation", "payment"] as const;
type InboxFilter = typeof VALID_FILTERS[number];

function parseFilter(raw: string | undefined): InboxFilter {
  const f = raw || "all";
  return VALID_FILTERS.includes(f as InboxFilter) ? (f as InboxFilter) : "all";
}

// ── GET /api/inbox — Liste avec pagination serveur (curseur date) ──
inboxRouter.get("/", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const filter = parseFilter(req.query.filter as string);
    const cursorDate = req.query.cursor as string | undefined;
    const cursorId = req.query.cursorId as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const showArchived = req.query.archived === "true";

    // Date-based cursor : ne fetch que les items AVANT ou ÉGAL à cette date
    // cursorId sert à exclure l'item déjà vu en cas de timestamp identique
    const beforeDate = cursorDate ? new Date(cursorDate) : undefined;

    const wantPartnership = filter === "all" || filter === "partnership";
    const wantDonation = filter === "all" || filter === "donation";
    const wantPayment = filter === "all" || filter === "payment";

    // Fetch limit+1 de chaque source pour la pagination
    const fetchLimit = limit + 1;

    const partnershipsP = wantPartnership
      ? prisma.partnershipRequest.findMany({
          where: {
            sellerId,
            ...(showArchived ? { archivedAt: { not: null } } : { archivedAt: null }),
            ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: fetchLimit,
          include: { block: { select: { title: true } } },
        })
      : Promise.resolve([] as never[]);

    const donationsP = wantDonation
      ? prisma.order.findMany({
          where: {
            sellerId,
            orderType: { in: ["DONATION", "PAYMENT"] },
            paymentStatus: "PAID",
            donorMessage: nonEmptyString(),
            ...(showArchived ? { inboxArchivedAt: { not: null } } : { inboxArchivedAt: null }),
            ...(beforeDate ? { paidAt: { lt: beforeDate } } : {}),
          },
          orderBy: { paidAt: "desc" },
          take: fetchLimit,
          select: {
            id: true, donorMessage: true, amount: true,
            customerName: true, customerEmail: true, customerPhone: true,
            paidAt: true, createdAt: true, inboxReadAt: true, inboxArchivedAt: true,
            paymentProvider: true,
            product: { select: { title: true } },
          },
        })
      : Promise.resolve([] as never[]);

    const paymentsP = wantPayment
      ? prisma.order.findMany({
          where: {
            sellerId,
            paymentStatus: "PAID",
            paymentNote: nonEmptyString(),
            orderType: { notIn: ["DONATION", "PAYMENT"] },
            ...(showArchived ? { inboxArchivedAt: { not: null } } : { inboxArchivedAt: null }),
            ...(beforeDate ? { paidAt: { lt: beforeDate } } : {}),
          },
          orderBy: { paidAt: "desc" },
          take: fetchLimit,
          select: {
            id: true, paymentNote: true, amount: true,
            customerName: true, customerEmail: true, customerPhone: true,
            paidAt: true, createdAt: true, inboxReadAt: true, inboxArchivedAt: true,
            paymentProvider: true,
            product: { select: { title: true } },
            bookingService: { select: { title: true } },
          },
        })
      : Promise.resolve([] as never[]);

    const [partnerships, donations, payments] = await Promise.all([partnershipsP, donationsP, paymentsP]);

    // Normalisation en InboxItem[]
    const items: InboxItem[] = [];

    for (const p of partnerships) {
      const isTestEmail = ["simulation@dev.test", "dev@test.com"].includes(p.email?.toLowerCase() || "");
      items.push({
        id: p.id,
        type: "partnership",
        message: p.message,
        senderName: p.name,
        senderEmail: p.email,
        senderPhone: p.phone,
        senderCompany: p.company,
        blockTitle: p.block?.title || null,
        budget: p.budget,
        amount: null,
        partnershipStatus: p.status,
        read: !!p.readAt,
        archived: !!p.archivedAt,
        date: p.createdAt.toISOString(),
        isTest: isTestEmail,
      });
    }

    for (const d of donations) {
      if (!d.donorMessage?.trim()) continue;
      const msgDate = d.paidAt || d.createdAt;
      const TEST_PROVIDERS = ["dev_simulation", "dev_credit"];
      items.push({
        id: d.id,
        type: "donation",
        message: d.donorMessage,
        senderName: d.customerName,
        senderEmail: d.customerEmail,
        senderPhone: d.customerPhone,
        senderCompany: null,
        blockTitle: d.product?.title || null,
        budget: null,
        amount: d.amount,
        partnershipStatus: null,
        read: !!d.inboxReadAt,
        archived: !!d.inboxArchivedAt,
        date: msgDate.toISOString(),
        isTest: TEST_PROVIDERS.includes(d.paymentProvider || ""),
      });
    }

    for (const p of payments) {
      if (!p.paymentNote?.trim()) continue;
      const msgDate = p.paidAt || p.createdAt;
      const TEST_PROVIDERS = ["dev_simulation", "dev_credit"];
      items.push({
        id: p.id,
        type: "payment",
        message: p.paymentNote,
        senderName: p.customerName,
        senderEmail: p.customerEmail,
        senderPhone: p.customerPhone,
        senderCompany: null,
        blockTitle: p.product?.title || p.bookingService?.title || null,
        budget: null,
        amount: p.amount,
        partnershipStatus: null,
        read: !!p.inboxReadAt,
        archived: !!p.inboxArchivedAt,
        date: msgDate.toISOString(),
        isTest: TEST_PROVIDERS.includes(p.paymentProvider || ""),
      });
    }

    // Tri par date décroissante (plus récent en premier)
    items.sort((a, b) => b.date.localeCompare(a.date));

    // Exclure l'item du curseur précédent (même timestamp)
    if (cursorId) {
      const idx = items.findIndex((i) => i.id === cursorId);
      if (idx >= 0) items.splice(0, idx + 1);
    }

    // Prendre les `limit` premiers items
    const hasMore = items.length > limit;
    const page = items.slice(0, limit);
    const lastItem = page[page.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.date : null;
    const nextCursorId = hasMore && lastItem ? lastItem.id : null;

    res.json({ items: page, nextCursor, nextCursorId, hasMore });
  } catch (err) {
    logger.error("Erreur GET /api/inbox", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/inbox/counts — Compteurs non-lus (par message individuel) ──
inboxRouter.get("/counts", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { lastOrdersSeenAt: true },
    });
    const lastOrdersSeen = seller?.lastOrdersSeenAt || new Date(0);

    const [unreadPartnerships, unreadDonations, unreadPayments, newOrders, upcomingBookings] = await Promise.all([
      // Partenariats non lus ET non archivés
      prisma.partnershipRequest.count({
        where: { sellerId, readAt: null, archivedAt: null },
      }),
      // Dons non lus ET non archivés (par message individuel)
      prisma.order.count({
        where: {
          sellerId,
          orderType: { in: ["DONATION", "PAYMENT"] },
          paymentStatus: "PAID",
          donorMessage: nonEmptyString(),
          inboxReadAt: null,
          inboxArchivedAt: null,
        },
      }),
      // Paiements avec note non lus ET non archivés (par message individuel)
      prisma.order.count({
        where: {
          sellerId,
          paymentStatus: "PAID",
          paymentNote: nonEmptyString(),
          orderType: { notIn: ["DONATION", "PAYMENT"] },
          inboxReadAt: null,
          inboxArchivedAt: null,
        },
      }),
      prisma.order.count({
        where: {
          sellerId,
          paymentStatus: "PAID",
          paidAt: { gt: lastOrdersSeen },
        },
      }),
      // Réservations à venir (confirmées, non annulées)
      prisma.order.count({
        where: {
          sellerId,
          orderType: "BOOKING",
          paymentStatus: "PAID",
          bookingDate: { gte: new Date() },
          bookingCancelled: { not: true },
        },
      }),
    ]);

    res.json({
      inbox: unreadPartnerships + unreadDonations + unreadPayments,
      orders: newOrders,
      bookings: upcomingBookings,
    });
  } catch (err) {
    logger.error("Erreur GET /api/inbox/counts", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /api/inbox/mark-read — Marquer un message comme lu (tous types) ──
const markReadSchema = z.object({
  type: z.enum(["partnership", "donation", "payment"]),
  id: z.string().min(1),
});

inboxRouter.post("/mark-read", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = markReadSchema.parse(req.body);

    if (data.type === "partnership") {
      await prisma.partnershipRequest.updateMany({
        where: { id: data.id, sellerId, readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      // donation ou payment — les deux sont des Order
      await prisma.order.updateMany({
        where: { id: data.id, sellerId, inboxReadAt: null },
        data: { inboxReadAt: new Date() },
      });
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }
    logger.error("Erreur POST /api/inbox/mark-read", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /api/inbox/archive — Archiver / désarchiver un message ──
const archiveSchema = z.object({
  type: z.enum(["partnership", "donation", "payment"]),
  id: z.string().min(1),
  archived: z.boolean(),
});

inboxRouter.post("/archive", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = archiveSchema.parse(req.body);
    const now = data.archived ? new Date() : null;

    if (data.type === "partnership") {
      await prisma.partnershipRequest.updateMany({
        where: { id: data.id, sellerId },
        data: { archivedAt: now },
      });
    } else {
      await prisma.order.updateMany({
        where: { id: data.id, sellerId },
        data: { inboxArchivedAt: now },
      });
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }
    logger.error("Erreur POST /api/inbox/archive", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /api/inbox/mark-seen — Met à jour lastInboxSeenAt / lastOrdersSeenAt ──
const markSeenSchema = z.object({
  target: z.enum(["inbox", "orders"]),
});

inboxRouter.post("/mark-seen", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { target } = markSeenSchema.parse(req.body);

    const field = target === "inbox" ? "lastInboxSeenAt" : "lastOrdersSeenAt";
    await prisma.seller.update({
      where: { id: sellerId },
      data: { [field]: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }
    logger.error("Erreur POST /api/inbox/mark-seen", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
