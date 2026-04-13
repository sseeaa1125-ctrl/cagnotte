import { Router, type Request, type Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/adminAuth.js";
import * as logger from "../../lib/logger.js";

const ROLE_HIERARCHY: Record<string, number> = { SUPER_ADMIN: 3, ADMIN: 2, SUPPORT: 1 };
function isAdminOrAbove(req: Request): boolean {
  return (ROLE_HIERARCHY[req.admin?.role || ""] || 0) >= 2;
}

export const adminSystemRouter = Router();

// ── GET /api/admin/system — Vue système ──
adminSystemRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const tab = (req.query.tab as string) || "webhooks";
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    if (tab === "webhooks") {
      const where: Record<string, unknown> = {};
      const statusFilter = req.query.status as string | undefined;
      if (statusFilter && statusFilter !== "all") {
        where.status = statusFilter;
      }
      if (hasDateFilter) where.createdAt = dateFilter;

      const [webhooks, total] = await Promise.all([
        prisma.webhookLog.findMany({
          where: where as never,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.webhookLog.count({ where: where as never }),
      ]);

      const [totalLogs, failedLogs, processedLogs] = await Promise.all([
        prisma.webhookLog.count(),
        prisma.webhookLog.count({ where: { status: { not: "processed" } } }),
        prisma.webhookLog.count({ where: { status: "processed" } }),
      ]);

      res.json({
        tab: "webhooks",
        webhooks,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        stats: { total: totalLogs, failed: failedLogs, processed: processedLogs },
      });
    } else if (tab === "adminlogs") {
      const where: Record<string, unknown> = {};
      const actionFilter = req.query.action as string | undefined;
      if (actionFilter && actionFilter !== "all") {
        where.action = { contains: actionFilter, mode: "insensitive" };
      }
      if (hasDateFilter) where.createdAt = dateFilter;

      const [logs, total] = await Promise.all([
        prisma.adminLog.findMany({
          where: where as never,
          select: {
            id: true,
            action: true,
            target: true,
            details: true,
            ip: true,
            createdAt: true,
            admin: { select: { name: true, email: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.adminLog.count({ where: where as never }),
      ]);

      res.json({
        tab: "adminlogs",
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } else if (tab === "config") {
      // ADM-2 FIX: Config sensible → ADMIN+ uniquement
      if (!isAdminOrAbove(req)) {
        res.status(403).json({ error: "Permissions insuffisantes" });
        return;
      }

      const configs = await prisma.platformConfig.findMany({
        orderBy: { key: "asc" },
      });

      const [sellerCount, adminCount] = await Promise.all([
        prisma.seller.count({ where: { deletedAt: null } }),
        prisma.admin.count({ where: { isActive: true } }),
      ]);

      res.json({
        tab: "config",
        configs,
        counts: { sellers: sellerCount, admins: adminCount },
      });
    } else if (tab === "admins") {
      // ADM-2 FIX: Liste admins → ADMIN+ uniquement
      if (!isAdminOrAbove(req)) {
        res.status(403).json({ error: "Permissions insuffisantes" });
        return;
      }
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: { select: { logs: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({ tab: "admins", admins });
    } else if (tab === "health") {
      // ── Health check financier — détecte les anomalies ──
      const [orphanedRefunds, stuckPendingOrders, stuckPendingWithdrawals, stuckPendingCommunity] = await Promise.all([
        // Commandes REFUNDED sans refundBictorysId (rollback raté après payout échoué)
        prisma.order.findMany({
          where: { paymentStatus: "REFUNDED", refundBictorysId: null },
          select: { id: true, reference: true, amount: true, sellerAmount: true, sellerId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        // Commandes PENDING depuis + de 1h (webhook jamais reçu)
        prisma.order.count({
          where: {
            paymentStatus: "PENDING",
            createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
            paymentProvider: { not: "free" },
          },
        }),
        // Retraits PENDING depuis + de 1h (payout API jamais répondu)
        prisma.withdrawal.count({
          where: {
            status: "PENDING",
            createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
          },
        }),
        // Paiements communauté PENDING depuis + de 1h
        prisma.communityPayment.count({
          where: {
            status: "PENDING",
            createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
          },
        }),
      ]);

      res.json({
        tab: "health",
        issues: {
          orphanedRefunds: { count: orphanedRefunds.length, items: orphanedRefunds },
          stuckPendingOrders: { count: stuckPendingOrders },
          stuckPendingWithdrawals: { count: stuckPendingWithdrawals },
          stuckPendingCommunity: { count: stuckPendingCommunity },
        },
        totalIssues: orphanedRefunds.length + stuckPendingOrders + stuckPendingWithdrawals + stuckPendingCommunity,
      });
    } else {
      res.status(400).json({ error: "Tab invalide" });
    }
  } catch (err) {
    logger.error("Erreur admin system", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
