import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/adminAuth.js";
import { getClientIp } from "../../lib/getClientIp.js";
import * as logger from "../../lib/logger.js";
import { formatZodError } from "../../lib/zodErrors.js";

export const adminWithdrawalsRouter = Router();

// ── GET /api/admin/withdrawals — Liste paginée, filtrable ──
adminWithdrawalsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string || "").trim();
    const status = req.query.status as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { seller: { displayName: { contains: search, mode: "insensitive" } } },
        { seller: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = end;
      }
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: where as never,
        select: {
          id: true,
          reference: true,
          amount: true,
          currency: true,
          status: true,
          phone: true,
          provider: true,
          recipientName: true,
          note: true,
          failureReason: true,
          merchantFee: true,
          processedAt: true,
          createdAt: true,
          seller: { select: { id: true, displayName: true, slug: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where: where as never }),
    ]);

    // Agrégats
    const [pendingAgg, completedAgg] = await Promise.all([
      prisma.withdrawal.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.withdrawal.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      withdrawals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        pendingAmount: pendingAgg._sum.amount || 0,
        pendingCount: pendingAgg._count,
        completedAmount: completedAgg._sum.amount || 0,
        completedCount: completedAgg._count,
      },
    });
  } catch (err) {
    logger.error("Erreur admin withdrawals list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/withdrawals/:id — Approuver/Rejeter ──
const withdrawalActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

adminWithdrawalsRouter.patch("/:id", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = withdrawalActionSchema.parse(req.body);
    const withdrawalId = req.params.id as string;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      select: { id: true, status: true, sellerId: true, amount: true },
    });

    if (!withdrawal) {
      res.status(404).json({ error: "Retrait introuvable" });
      return;
    }

    if (withdrawal.status !== "PENDING") {
      res.status(400).json({ error: `Ce retrait est déjà ${withdrawal.status}` });
      return;
    }

    const newStatus = data.action === "approve" ? "PROCESSING" : "REJECTED";

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: newStatus,
        failureReason: data.action === "reject" ? data.reason || null : null,
        processedAt: new Date(),
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: data.action === "approve" ? "WITHDRAWAL_APPROVED" : "WITHDRAWAL_REJECTED",
        target: `withdrawal:${withdrawalId}`,
        details: {
          sellerId: withdrawal.sellerId,
          amount: withdrawal.amount,
          reason: data.reason || null,
        },
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, status: newStatus });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur admin withdrawal action", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
