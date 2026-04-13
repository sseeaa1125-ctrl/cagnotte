import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import * as logger from "../lib/logger.js";

export const reportsRouter = Router();

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("report"),
  message: { error: "Trop de signalements. Réessaye plus tard." },
});

const VALID_REASONS = ["SPAM", "SCAM", "INAPPROPRIATE", "IMPERSONATION", "OTHER"] as const;

const createReportSchema = z.object({
  storeSlug: z.string().min(1).max(50),
  reason: z.enum(VALID_REASONS),
  description: z.string().max(1000).optional(),
  email: z.string().email().max(200).optional(),
});

// POST /api/reports — create a report (no auth required, rate limited)
reportsRouter.post("/", reportLimiter, async (req, res) => {
  try {
    const data = createReportSchema.parse(req.body);

    // Check that the store exists
    const seller = await prisma.seller.findUnique({
      where: { slug: data.storeSlug },
      select: { id: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Page introuvable" });
      return;
    }

    await prisma.report.create({
      data: {
        storeSlug: data.storeSlug,
        reason: data.reason,
        description: data.description || null,
        email: data.email || null,
        sellerId: seller.id,
      },
    });

    logger.log(`Report created for store: ${data.storeSlug}, reason: ${data.reason}`);

    res.status(201).json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Données invalides", details: err.errors });
      return;
    }
    logger.error("Failed to create report", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
