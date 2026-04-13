import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../lib/logger.js";

export const leadsRouter = Router();

// ── GET /api/leads — liste des campagnes (blocs lead + communautés) ──
leadsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // Get all lead-generating blocks
    const blocks = await prisma.block.findMany({
      where: {
        sellerId,
        type: { in: ["LEAD_MAGNET", "WAITING_LIST", "PARTNERSHIP"] },
      },
      include: {
        product: true,
        partnershipRequests: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // PERF-4: Single groupBy query instead of N+1 count per block
    const productIds = blocks
      .filter((b) => b.product)
      .map((b) => b.product!.id);

    const orderCounts: Record<string, number> = {};
    if (productIds.length > 0) {
      const grouped = await prisma.order.groupBy({
        by: ["productId"],
        where: { productId: { in: productIds }, paymentStatus: "PAID" },
        _count: { id: true },
      });
      for (const g of grouped) {
        if (g.productId) orderCounts[g.productId] = g._count.id;
      }
    }

    const campaigns = [];
    for (const block of blocks) {
      try {
        let subscriberCount = 0;
        if (block.type === "PARTNERSHIP") {
          subscriberCount = block.partnershipRequests.length;
        } else if (block.product) {
          subscriberCount = orderCounts[block.product.id] || 0;
        }

        campaigns.push({
          id: block.id,
          type: block.type,
          title: block.type === "PARTNERSHIP"
            ? (block.config as Record<string, string>)?.title || block.title
            : block.product?.title || block.title,
          coverUrl: block.product?.coverUrl || null,
          isActive: block.isActive,
          subscriberCount,
          maxSubscribers: block.product?.maxSubscribers || null,
          createdAt: block.createdAt,
        });
      } catch (blockErr) {
        logger.error(`Erreur comptage bloc ${block.id}`, blockErr);
      }
    }

    // Also include communities as campaigns (wrapped for robustness)
    try {
      const communities = await prisma.community.findMany({
        where: { sellerId },
        include: {
          _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const c of communities) {
        campaigns.push({
          id: c.id,
          type: "COMMUNITY" as const,
          title: c.title,
          coverUrl: null,
          isActive: c.isActive,
          subscriberCount: c._count.subscriptions,
          maxSubscribers: null,
          createdAt: c.createdAt,
        });
      }
    } catch (communityErr) {
      logger.error("Erreur chargement communautés dans leads", communityErr);
    }

    // Sort all by most recent
    campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(campaigns);
  } catch (err) {
    logger.error("Erreur liste leads", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/leads/:blockId — inscrits d'une campagne ──
leadsRouter.get("/:blockId", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const blockId = req.params.blockId as string;

    const block = await prisma.block.findUnique({
      where: { id: blockId },
    });
    if (!block || block.sellerId !== sellerId) {
      res.status(404).json({ error: "Campagne introuvable" });
      return;
    }

    if (block.type === "PARTNERSHIP") {
      // Return partnership requests
      const requests = await prisma.partnershipRequest.findMany({
        where: { blockId },
        orderBy: { createdAt: "desc" },
      });
      res.json({
        type: "PARTNERSHIP",
        leads: requests.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          company: r.company,
          phone: r.phone,
          message: r.message,
          budget: r.budget,
          status: r.status,
          createdAt: r.createdAt,
        })),
      });
      return;
    }

    // LEAD_MAGNET or WAITING_LIST — return orders
    const product = await prisma.product.findFirst({
      where: { block: { id: blockId } },
    });
    if (!product) {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }

    // H8: Pagination pour éviter de charger 50k+ lignes en mémoire
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const cursor = req.query.cursor as string | undefined;

    const orders = await prisma.order.findMany({
      where: { productId: product.id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        customFields: true,
        createdAt: true,
      },
    });

    const hasMore = orders.length > limit;
    const results = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    res.json({
      type: block.type,
      leads: results.map((o) => ({
        id: o.id,
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        customFields: o.customFields as Record<string, string> | null,
        createdAt: o.createdAt,
      })),
      nextCursor,
      hasMore,
    });
  } catch (err) {
    logger.error("Erreur détail leads", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
