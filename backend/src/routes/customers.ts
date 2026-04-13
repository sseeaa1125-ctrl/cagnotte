import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import * as logger from "../lib/logger.js";

export const customersRouter = Router();

// GET /api/customers — liste des clients du vendeur (auth requise)
customersRouter.get("/", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // M5: Add pagination limit
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const cursor = req.query.cursor as string | undefined;

    const customers = await prisma.customer.findMany({
      where: { sellerId },
      orderBy: { totalSpent: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        totalSpent: true,
        orderCount: true,
        createdAt: true,
      },
    });

    const hasMore = customers.length > limit;
    const results = hasMore ? customers.slice(0, limit) : customers;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    res.json({ customers: results, nextCursor, hasMore });
  } catch (err) {
    logger.error("Erreur liste clients", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/customers/:id — détail d'un client avec ses commandes (auth requise)
customersRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const customerId = req.params.id as string;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, sellerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        totalSpent: true,
        orderCount: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            reference: true,
            orderType: true,
            amount: true,
            sellerAmount: true,
            paymentStatus: true,
            paymentOperator: true,
            paidAt: true,
            createdAt: true,
            paymentNote: true,
            product: { select: { title: true } },
            bookingService: { select: { title: true } },
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: "Client introuvable" });
      return;
    }

    res.json({ customer });
  } catch (err) {
    logger.error("Erreur détail client", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
