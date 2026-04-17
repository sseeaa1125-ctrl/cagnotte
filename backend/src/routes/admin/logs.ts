import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as logger from "../../lib/logger.js";

export const logsRouter = Router();

// All routes require admin auth
logsRouter.use(requireAdmin);

// ── GET / — Paginated AdminLog with filters ──
const listQuerySchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

logsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Parametres invalides", details: parsed.error.flatten() });
      return;
    }

    const { adminId, action, search, dateFrom, dateTo, page, limit } = parsed.data;
    const where: Prisma.AdminLogWhereInput = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    // Search filter
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { target: { contains: search, mode: "insensitive" } },
        { admin: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from.getTime())) {
          (where.createdAt as Prisma.DateTimeFilter).gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to.getTime())) {
          // End of the day
          to.setHours(23, 59, 59, 999);
          (where.createdAt as Prisma.DateTimeFilter).lte = to;
        }
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.adminLog.count({ where }),
    ]);

    // Also fetch distinct admins for filter dropdown
    const admins = await prisma.admin.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    // Fetch distinct actions for filter dropdown
    const distinctActions = await prisma.adminLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      logs,
      totalCount,
      totalPages,
      currentPage: page,
      admins,
      actions: distinctActions.map((d) => d.action),
    });
  } catch (err) {
    logger.error("admin:logs:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
