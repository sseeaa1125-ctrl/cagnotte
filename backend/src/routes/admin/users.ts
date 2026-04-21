import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireRole, evictAdminCache } from "../../middleware/requireAdmin.js";
import { hashPassword } from "../../lib/adminAuth.js";
import { logAdminAction } from "../../lib/adminLog.js";
import * as logger from "../../lib/logger.js";

export const usersRouter = Router();

// All routes require SUPER_ADMIN role
usersRouter.use(requireRole("SUPER_ADMIN"));

// ── GET / — List all admin users ──
usersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ admins });
  } catch (err) {
    logger.error("admin:users:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST / — Create a new admin ──
const createSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("Email invalide")),
  name: z.string().min(1, "Nom requis").max(100),
  password: z.string().min(8, "Mot de passe minimum 8 caracteres"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT"]).default("ADMIN"),
});

usersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { email, name, password, role } = parsed.data;

    // Check if email already exists
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Un admin avec cet email existe deja" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAdminAction(
      req.admin!.id,
      "ADMIN_CREATED",
      `admin:${admin.id}`,
      { email, name, role },
      req.ip,
    );

    res.status(201).json({ admin });
  } catch (err) {
    logger.error("admin:users:create", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id — Update admin role or toggle isActive ──
const updateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT"]).optional(),
  isActive: z.boolean().optional(),
});

usersRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }

    const { role, isActive } = parsed.data;

    // Prevent self-deactivation
    if (id === req.admin!.id && isActive === false) {
      res.status(400).json({ error: "Vous ne pouvez pas desactiver votre propre compte" });
      return;
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    if (!admin) {
      res.status(404).json({ error: "Admin introuvable" });
      return;
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "Aucune modification" });
      return;
    }

    await prisma.admin.update({
      where: { id },
      data,
    });

    // Evict from auth cache when deactivating an admin
    if (isActive === false) {
      evictAdminCache(id);
    }

    await logAdminAction(
      req.admin!.id,
      "ADMIN_UPDATED",
      `admin:${id}`,
      {
        changes: data,
        previous: { role: admin.role, isActive: admin.isActive },
      },
      req.ip,
    );

    res.json({ ok: true });
  } catch (err) {
    logger.error("admin:users:update", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /bulk/set-active — Bulk activate/deactivate admins ──
// Garde-fous critiques :
//  1. Self-target refusé (un admin ne peut pas se désactiver lui-même)
//  2. Sur deactivate : refuser si l'opération laisse < 1 SUPER_ADMIN actif
//     (sinon plus personne ne peut administrer la plateforme)
const bulkActiveSchema = z.object({
  adminIds: z.array(z.string().min(1)).min(1).max(100),
  isActive: z.boolean(),
});

usersRouter.post("/bulk/set-active", async (req: Request, res: Response) => {
  const parsed = bulkActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
    return;
  }

  const { adminIds, isActive } = parsed.data;

  // Guard #1 — self-target : refus explicite (pas silencieux), sinon un
  // admin pourrait accidentellement se désactiver en bulk-sélectionnant.
  if (!isActive && adminIds.includes(req.admin!.id)) {
    res.status(400).json({
      error: "Vous ne pouvez pas désactiver votre propre compte dans la sélection.",
    });
    return;
  }

  // Guard #2 — SUPER_ADMIN watchdog. Si on désactive, vérifier qu'il
  // restera au moins 1 SUPER_ADMIN actif après l'opération.
  if (!isActive) {
    const targets = await prisma.admin.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, role: true, isActive: true },
    });
    const activeSuperAdminsCount = await prisma.admin.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    const willDeactivateSuperAdmins = targets.filter(
      (a) => a.role === "SUPER_ADMIN" && a.isActive,
    ).length;
    if (activeSuperAdminsCount - willDeactivateSuperAdmins < 1) {
      res.status(400).json({
        error: "Opération refusée : au moins 1 SUPER_ADMIN actif doit rester.",
      });
      return;
    }
  }

  const existing = await prisma.admin.findMany({
    where: { id: { in: adminIds } },
    select: { id: true },
  });
  const existingIds = existing.map((a) => a.id);

  const { count: updatedCount } = await prisma.admin.updateMany({
    where: { id: { in: existingIds } },
    data: { isActive },
  });

  // Éviction du cache d'auth pour tous les désactivés (sinon ils peuvent
  // continuer à utiliser leur session jusqu'au TTL 30s)
  if (!isActive) {
    for (const id of existingIds) evictAdminCache(id);
  }

  await logAdminAction(
    req.admin!.id,
    isActive ? "ADMIN_BULK_ACTIVATED" : "ADMIN_BULK_DEACTIVATED",
    `admins:${existingIds.length}`,
    {
      requestedIds: adminIds,
      appliedIds: existingIds,
      count: updatedCount,
    },
    req.ip,
  );

  const failedIds = adminIds.filter((id) => !existingIds.includes(id));
  res.json({
    ok: true,
    updated: updatedCount,
    succeededIds: existingIds,
    failedIds,
  });
});
