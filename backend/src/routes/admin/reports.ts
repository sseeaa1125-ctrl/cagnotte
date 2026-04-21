import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import { toCsv, sendCsv } from "../../lib/csv.js";
import * as logger from "../../lib/logger.js";

function buildReportsWhere(req: Request): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  const status = req.query.status as string | undefined;
  const search = (req.query.search as string | undefined)?.trim();
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  if (status && ["PENDING", "REVIEWED", "DISMISSED"].includes(status)) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { storeSlug: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { seller: { displayName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom + "T00:00:00Z");
    }
    if (dateTo) {
      (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + "T23:59:59Z");
    }
  }
  return where;
}

export const reportsRouter = Router();

// All routes require admin auth
reportsRouter.use(requireAdmin);

// ── GET / — Paginated list with status filter ──
const listQuerySchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

reportsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parametres invalides", details: parsed.error.flatten() });
      return;
    }

    const { status, search, page, limit, dateFrom, dateTo } = parsed.data;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Search filter
    if (search) {
      where.OR = [
        { storeSlug: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { seller: { displayName: { contains: search, mode: "insensitive" } } },
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

    const [reports, totalCount] = await Promise.all([
      prisma.report.findMany({
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
      prisma.report.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ reports, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:reports:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /export.csv — Full CSV dump matching current filters ──
reportsRouter.get("/export.csv", async (req: Request, res: Response) => {
  try {
    const where = buildReportsWhere(req);
    const reports = await prisma.report.findMany({
      where,
      include: {
        seller: { select: { displayName: true, slug: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50_000,
    });

    const headers = [
      "createdAt",
      "status",
      "storeSlug",
      "reason",
      "reporterEmail",
      "sellerSlug",
      "sellerName",
      "sellerEmail",
    ];

    const rows = reports.map((r) => [
      r.createdAt,
      r.status,
      r.storeSlug,
      r.reason,
      r.email ?? "",
      r.seller?.slug ?? "",
      r.seller?.displayName ?? "",
      r.seller?.email ?? "",
    ]);

    const filename = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
    sendCsv(res, filename, toCsv(headers, rows));
  } catch (err) {
    logger.error("admin:reports:export", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id — Review or dismiss a report ──
const reviewBodySchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
});

reportsRouter.patch("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const parsed = reviewBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { status } = parsed.data;

    const report = await prisma.report.findUnique({
      where: { id },
      select: { id: true, storeSlug: true, status: true },
    });

    if (!report) {
      res.status(404).json({ error: "Signalement introuvable" });
      return;
    }

    await prisma.report.update({
      where: { id },
      data: { status },
    });

    await logAdminAction(
      req.admin!.id,
      status === "REVIEWED" ? "REPORT_REVIEWED" : "REPORT_DISMISSED",
      `report:${id}`,
      { storeSlug: report.storeSlug, previousStatus: report.status },
      req.ip,
    );

    res.json({ ok: true, status });
  } catch (err) {
    logger.error("admin:reports:review", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
