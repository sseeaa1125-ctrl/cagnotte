import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/adminAuth.js";
import { getClientIp } from "../../lib/getClientIp.js";
import * as logger from "../../lib/logger.js";
import { formatZodError } from "../../lib/zodErrors.js";

export const adminReportsRouter = Router();

// ── GET /api/admin/reports — Liste paginée des signalements ──
adminReportsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = (req.query.status as string) || "";
    const search = (req.query.search as string || "").trim();

    const where: Record<string, unknown> = {};

    if (status && ["PENDING", "REVIEWED", "DISMISSED"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { storeSlug: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: where as never,
        select: {
          id: true,
          storeSlug: true,
          reason: true,
          description: true,
          email: true,
          status: true,
          sellerId: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              slug: true,
              isFlagged: true,
              plan: true,
              _count: {
                select: { reports: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where: where as never }),
    ]);

    // Count pending reports
    const pendingCount = await prisma.report.count({ where: { status: "PENDING" } });

    res.json({
      reports,
      pendingCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("Erreur admin reports list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /api/admin/reports/:id/status — Changer le statut d'un signalement ──
const updateStatusSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
});

adminReportsRouter.patch("/:id/status", requireAdmin, requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const data = updateStatusSchema.parse(req.body);
    const reportId = req.params.id as string;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, storeSlug: true, status: true },
    });
    if (!report) { res.status(404).json({ error: "Signalement introuvable" }); return; }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: data.status },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: `REPORT_${data.status}`,
        target: `report:${reportId}`,
        details: { storeSlug: report.storeSlug },
        ip: getClientIp(req),
      },
    });

    res.json({ ok: true, status: data.status });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur admin report status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
