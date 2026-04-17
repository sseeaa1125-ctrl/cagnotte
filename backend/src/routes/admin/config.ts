import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireRole } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import * as logger from "../../lib/logger.js";

export const configRouter = Router();

// All routes require SUPER_ADMIN role
configRouter.use(requireRole("SUPER_ADMIN"));

// ── GET / — List all PlatformConfig rows ──
configRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.platformConfig.findMany({
      orderBy: { key: "asc" },
    });

    res.json({ configs });
  } catch (err) {
    logger.error("admin:config:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /:key — Upsert a config value ──
const upsertSchema = z.object({
  value: z.unknown(),
});

configRouter.put("/:key", async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { value } = parsed.data;

    const config = await prisma.platformConfig.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });

    await logAdminAction(
      req.admin!.id,
      "CONFIG_UPSERTED",
      `config:${key}`,
      { value },
      req.ip,
    );

    res.json({ ok: true, config });
  } catch (err) {
    logger.error("admin:config:upsert", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /:key — Delete a config entry ──
configRouter.delete("/:key", async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;

    const existing = await prisma.platformConfig.findUnique({ where: { key } });
    if (!existing) {
      res.status(404).json({ error: "Cle de configuration introuvable" });
      return;
    }

    await prisma.platformConfig.delete({ where: { key } });

    await logAdminAction(
      req.admin!.id,
      "CONFIG_DELETED",
      `config:${key}`,
      { previousValue: existing.value },
      req.ip,
    );

    res.json({ ok: true });
  } catch (err) {
    logger.error("admin:config:delete", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
