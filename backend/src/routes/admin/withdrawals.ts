import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import { checkPayoutStatus, initiatePayout, parseBictorysPayoutError } from "../../lib/payout.js";
import { getCountryFromPhone } from "../../lib/phone.js";
import { firePayoutCancelled, firePayoutCompleted, firePayoutFailed } from "../../lib/notifications/dispatch.js";
import * as logger from "../../lib/logger.js";

export const withdrawalsAdminRouter = Router();

// All routes require admin auth
withdrawalsAdminRouter.use(requireAdmin);

// ── GET / — Paginated list with status filter ──
const listQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

withdrawalsAdminRouter.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parametres invalides", details: parsed.error.flatten() });
      return;
    }

    const { status, search, page, limit, dateFrom, dateTo } = parsed.data;
    const VALID_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"];
    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) where.status = status;

    // Search filter
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { seller: { displayName: { contains: search, mode: "insensitive" } } },
        { seller: { email: { contains: search, mode: "insensitive" } } },
        { seller: { slug: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom + "T00:00:00Z");
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59Z");
      }
    }

    const [withdrawals, totalCount] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ withdrawals, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:withdrawals:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /:id — Withdrawal detail with seller info ──
withdrawalsAdminRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            email: true,
            phone: true,
            payoutPhone: true,
            payoutProvider: true,
            payoutName: true,
          },
        },
      },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Retrait introuvable" });
      return;
    }

    res.json({ withdrawal });
  } catch (err) {
    logger.error("admin:withdrawals:detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /:id/retry — Check payout status for stuck withdrawals ──
withdrawalsAdminRouter.post("/:id/retry", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        bictorysTransactionId: true,
        reference: true,
      },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Retrait introuvable" });
      return;
    }

    if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
      res.status(400).json({ error: "Ce retrait ne peut pas etre relance (statut: " + withdrawal.status + ")" });
      return;
    }

    if (!withdrawal.bictorysTransactionId) {
      res.status(400).json({ error: "Pas de transaction Bictorys associee a ce retrait" });
      return;
    }

    const result = await checkPayoutStatus(withdrawal.bictorysTransactionId);

    if (!result) {
      res.json({ status: withdrawal.status, message: "Statut inchange — reessayez plus tard" });
      return;
    }

    // Map payout status to withdrawal status
    let newStatus: string | null = null;
    if (result.status === "succeeded") {
      newStatus = "COMPLETED";
    } else if (result.status === "failed") {
      newStatus = "REJECTED";
    }

    if (newStatus && newStatus !== withdrawal.status) {
      await prisma.withdrawal.update({
        where: { id },
        data: {
          status: newStatus as "COMPLETED" | "REJECTED",
          processedAt: new Date(),
          ...(result.status === "failed" && result.reason
            ? { failureReason: result.reason }
            : {}),
        },
      });

      await logAdminAction(
        req.admin!.id,
        "WITHDRAWAL_STATUS_UPDATED",
        `withdrawal:${id}`,
        {
          previousStatus: withdrawal.status,
          newStatus,
          reason: result.reason,
          bictorysTransactionId: withdrawal.bictorysTransactionId,
        },
        req.ip,
      );

      res.json({ status: newStatus, message: `Statut mis a jour: ${newStatus}` });
      return;
    }

    res.json({ status: withdrawal.status, message: "Statut inchange (toujours en cours)" });
  } catch (err) {
    logger.error("admin:withdrawals:retry", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /:id/cancel — Cancel a PENDING withdrawal (48h window) ──
const cancelSchema = z.object({
  reason: z.string().min(1, "Raison requise").max(500),
});

withdrawalsAdminRouter.post("/:id/cancel", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Raison requise", details: parsed.error.flatten() });
      return;
    }

    const { reason } = parsed.data;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sellerId: true,
        amount: true,
        phone: true,
        provider: true,
        bictorysTransactionId: true,
      },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Retrait introuvable" });
      return;
    }

    if (withdrawal.status !== "PENDING") {
      res.status(400).json({
        error: `Ce retrait ne peut pas etre annule (statut: ${withdrawal.status}). Seuls les retraits en attente peuvent etre annules.`,
      });
      return;
    }

    // Don't cancel if already submitted to Bictorys
    if (withdrawal.bictorysTransactionId) {
      res.status(400).json({
        error: "Ce retrait a deja ete soumis au provider de paiement et ne peut plus etre annule.",
      });
      return;
    }

    await prisma.withdrawal.update({
      where: { id },
      data: {
        status: "REJECTED",
        failureReason: `Annulé par admin: ${reason}`,
        processedAt: new Date(),
      },
    });

    // Fire notification + email to the seller
    firePayoutCancelled(
      {
        id: withdrawal.id,
        sellerId: withdrawal.sellerId,
        amount: withdrawal.amount,
        phone: withdrawal.phone,
        provider: withdrawal.provider,
      },
      reason,
    ).catch((err) => logger.error("admin:withdrawals:cancel notification", err));

    await logAdminAction(
      req.admin!.id,
      "WITHDRAWAL_CANCELLED",
      `withdrawal:${id}`,
      { reason, amount: withdrawal.amount, sellerId: withdrawal.sellerId },
      req.ip,
    );

    res.json({ success: true, message: "Retrait annule avec succes" });
  } catch (err) {
    logger.error("admin:withdrawals:cancel", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /:id/execute — Admin instant withdrawal execution (skip 48h delay) ──
withdrawalsAdminRouter.post("/:id/execute", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        sellerId: true,
        amount: true,
        phone: true,
        provider: true,
        recipientName: true,
        reference: true,
        idempotencyKey: true,
        bictorysTransactionId: true,
      },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Retrait introuvable" });
      return;
    }

    if (withdrawal.status !== "PENDING") {
      res.status(400).json({
        error: `Ce retrait ne peut pas etre execute (statut: ${withdrawal.status}). Seuls les retraits en attente peuvent etre executes.`,
      });
      return;
    }

    if (withdrawal.bictorysTransactionId) {
      res.status(400).json({
        error: "Ce retrait a deja ete soumis au provider de paiement.",
      });
      return;
    }

    // Initiate payout via Bictorys immediately
    const payoutCountry = getCountryFromPhone(withdrawal.phone);
    const result = await initiatePayout(
      {
        amount: withdrawal.amount,
        phone: withdrawal.phone,
        operator: withdrawal.provider,
        recipientName: withdrawal.recipientName || "Vendeur",
        merchantReference: withdrawal.reference,
        country: payoutCountry,
      },
      withdrawal.idempotencyKey || withdrawal.reference,
    );

    const dispatchPayload = {
      id: withdrawal.id,
      sellerId: withdrawal.sellerId,
      amount: withdrawal.amount,
      phone: withdrawal.phone,
      provider: withdrawal.provider,
    };

    if (result.success) {
      await prisma.withdrawal.update({
        where: { id },
        data: {
          status: "COMPLETED",
          bictorysTransactionId: result.data?.id || null,
          merchantFee: result.data?.merchantFee || 0,
          processedAt: new Date(),
        },
      });

      firePayoutCompleted(dispatchPayload).catch((err) =>
        logger.error("admin:withdrawals:execute firePayoutCompleted", err),
      );

      await logAdminAction(
        req.admin!.id,
        "WITHDRAWAL_EXECUTED",
        `withdrawal:${id}`,
        {
          amount: withdrawal.amount,
          sellerId: withdrawal.sellerId,
          bictorysId: result.data?.id,
          reference: withdrawal.reference,
        },
        req.ip,
      );

      res.json({ success: true, status: "COMPLETED", message: "Retrait execute avec succes" });
    } else {
      const userMessage = parseBictorysPayoutError(result.httpStatus, result.error);
      const failureReason = result.error?.slice(0, 500) || "Erreur Bictorys";

      await prisma.withdrawal.update({
        where: { id },
        data: {
          status: "REJECTED",
          failureReason,
          processedAt: new Date(),
        },
      });

      firePayoutFailed(dispatchPayload, userMessage).catch((err) =>
        logger.error("admin:withdrawals:execute firePayoutFailed", err),
      );

      await logAdminAction(
        req.admin!.id,
        "WITHDRAWAL_EXECUTE_FAILED",
        `withdrawal:${id}`,
        {
          amount: withdrawal.amount,
          sellerId: withdrawal.sellerId,
          error: failureReason,
          reference: withdrawal.reference,
        },
        req.ip,
      );

      res.status(400).json({
        success: false,
        status: "REJECTED",
        message: `Echec du retrait: ${userMessage}`,
      });
    }
  } catch (err) {
    logger.error("admin:withdrawals:execute", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
