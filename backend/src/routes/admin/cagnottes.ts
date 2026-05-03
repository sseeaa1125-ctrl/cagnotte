import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireRole } from "../../middleware/requireAdmin.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { logAdminAction } from "../../lib/adminLog.js";
import { validateBlockConfig } from "../../lib/blocks/schemas.js";
import { fireCardApproved, fireCardRejected } from "../../lib/notifications/dispatch.js";
import * as logger from "../../lib/logger.js";

export const cagnottesAdminRouter = Router();

// All routes require admin auth
cagnottesAdminRouter.use(requireAdmin);

// ── Types ──
interface FundraiserConfig {
  title?: string;
  description?: string;
  coverUrl?: string | null;
  subtype?: "festive" | "solidaire";
  visibility?: "public" | "private";
  status?: "active" | "closed";
  goalAmount?: number;
  endDate?: string | null;
}

// ── GET / — Paginated fundraiser blocks with search & filters ──
cagnottesAdminRouter.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BlockWhereInput = { type: "FUNDRAISER" };

    // Search by title or slug
    const search = (req.query.search as string)?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    // Subtype filter (from config JSON)
    const subtype = req.query.subtype as string;
    if (subtype && ["festive", "solidaire"].includes(subtype)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { config: { path: ["subtype"], equals: subtype } },
      ];
    }

    // Status filter (from config JSON)
    const status = req.query.status as string;
    if (status && ["active", "closed"].includes(status)) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { config: { path: ["status"], equals: status } },
      ];
    }

    // Date range filter
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom + "T00:00:00Z");
      }
      if (dateTo) {
        (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59Z");
      }
    }

    const [blocks, totalCount] = await Promise.all([
      prisma.block.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          config: true,
          isActive: true,
          createdAt: true,
          seller: {
            select: {
              id: true,
              slug: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.block.count({ where }),
    ]);

    // Single grouped aggregate — no N+1
    const blockIds = blocks.map((b) => b.id);
    const totals =
      blockIds.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ["blockId"],
            where: { blockId: { in: blockIds }, paymentStatus: "PAID" },
            _sum: { amount: true },
            _count: { _all: true },
          });
    const totalsMap = new Map<string, { sum: number; count: number }>();
    for (const t of totals) {
      if (!t.blockId) continue;
      totalsMap.set(t.blockId, {
        sum: t._sum.amount || 0,
        count: t._count._all,
      });
    }

    const cagnottes = blocks.map((block) => {
      const cfg = (block.config as FundraiserConfig) || {};
      const stats = totalsMap.get(block.id) || { sum: 0, count: 0 };
      return {
        id: block.id,
        slug: block.slug,
        title: block.title,
        subtype: cfg.subtype ?? null,
        status: cfg.status ?? "active",
        visibility: cfg.visibility ?? "public",
        goalAmount: cfg.goalAmount ?? null,
        totalRaised: stats.sum,
        donorCount: stats.count,
        isActive: block.isActive,
        seller: block.seller,
        createdAt: block.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ cagnottes, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:cagnottes:list", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /card-requests — Queue des demandes d'activation carte bancaire ──
// IMPORTANT : doit être déclaré AVANT GET /:id sinon Express matche
// "card-requests" comme un id et renvoie 404.
//
// Filtre par config.cardStatus (JSON path query Prisma). Pattern miroir de
// /admin/kyc avec pagination + search + dateRange. Inclut seller.kycStatus
// pour permettre au front d'afficher un tooltip "KYC requis" sur le bouton
// "Approuver" quand le seller n'est pas encore validé.
const cardRequestsQuerySchema = z.object({
  status: z.enum(["NONE", "REQUESTED", "APPROVED", "REJECTED"]).default("REQUESTED"),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

cagnottesAdminRouter.get("/card-requests", async (req, res) => {
  try {
    const parsed = cardRequestsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Paramètres invalides", details: parsed.error.flatten() });
      return;
    }
    const { status, search, page, limit, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.BlockWhereInput = {
      type: "FUNDRAISER",
      config: { path: ["cardStatus"], equals: status },
    };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { seller: { displayName: { contains: search, mode: "insensitive" } } },
        { seller: { email: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (dateFrom || dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo);
      where.createdAt = createdAt;
    }

    const [items, totalCount] = await Promise.all([
      prisma.block.findMany({
        where,
        // Tri par createdAt — le tri par cardRequestedAt JSON path n'est pas
        // supporté par Prisma sans raw SQL. Acceptable v1 puisque les
        // demandes en attente sont filtrées sur le même jour la plupart du temps.
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
          createdAt: true,
          config: true,
          seller: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              email: true,
              kycStatus: true,
            },
          },
        },
      }),
      prisma.block.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    res.json({ requests: items, totalCount, totalPages, currentPage: page });
  } catch (err) {
    logger.error("admin:cagnottes:card-requests", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /:id — Block detail with seller + last 20 paid orders ──
cagnottesAdminRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id as string;

    const block = await prisma.block.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        config: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        seller: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });

    if (!block || (block as { type?: string }).type !== undefined) {
      // Ensure it exists
    }
    if (!block) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as FundraiserConfig) || {};

    // Aggregate stats
    const agg = await prisma.order.aggregate({
      where: { blockId: id, paymentStatus: "PAID" },
      _sum: { amount: true, commissionAmount: true, sellerAmount: true },
      _count: { _all: true },
    });

    // Last 20 paid orders
    const recentOrders = await prisma.order.findMany({
      where: { blockId: id, paymentStatus: "PAID" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        commissionAmount: true,
        sellerAmount: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        donorMessage: true,
        isAnonymous: true,
        paymentOperator: true,
        paidAt: true,
        createdAt: true,
      },
    });

    res.json({
      cagnotte: {
        id: block.id,
        slug: block.slug,
        title: block.title,
        subtype: cfg.subtype ?? null,
        status: cfg.status ?? "active",
        visibility: cfg.visibility ?? "public",
        goalAmount: cfg.goalAmount ?? null,
        endDate: cfg.endDate ?? null,
        description: cfg.description ?? null,
        coverUrl: cfg.coverUrl ?? null,
        isActive: block.isActive,
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
        // Config brute — consommée par la page d'édition admin
        // /admin/cagnottes/:id/modifier pour alimenter tous les champs
        // (gallery, suggestedAmounts, hideAmount, thankYouMessage, etc.).
        config: block.config,
      },
      seller: block.seller,
      stats: {
        totalRaised: agg._sum.amount ?? 0,
        totalCommission: agg._sum.commissionAmount ?? 0,
        totalSellerAmount: agg._sum.sellerAmount ?? 0,
        donorCount: agg._count._all,
      },
      recentOrders,
    });
  } catch (err) {
    logger.error("admin:cagnottes:detail", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id/toggle-active — Toggle isActive ──
cagnottesAdminRouter.patch("/:id/toggle-active", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;

    const block = await prisma.block.findUnique({
      where: { id },
      select: { id: true, isActive: true, type: true },
    });
    if (!block || block.type !== "FUNDRAISER") {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const newActive = !block.isActive;
    await prisma.block.update({
      where: { id },
      data: { isActive: newActive },
    });

    await logAdminAction(
      req.admin!.id,
      newActive ? "CAGNOTTE_ACTIVATED" : "CAGNOTTE_DEACTIVATED",
      `block:${id}`,
      {},
      req.ip,
    );

    res.json({ success: true, isActive: newActive });
  } catch (err) {
    logger.error("admin:cagnottes:toggle-active", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /bulk/set-active — Bulk activate/deactivate cagnottes ──
// Pas de hard delete : les cagnottes FUNDRAISER avec PAID orders sont
// financièrement traçables — désactivation = isActive=false (soft).
// Historique + compteurs préservés.
const bulkActiveSchema = z.object({
  cagnotteIds: z.array(z.string().min(1)).min(1).max(100),
  isActive: z.boolean(),
});

cagnottesAdminRouter.post(
  "/bulk/set-active",
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    const parsed = bulkActiveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
      return;
    }
    const { cagnotteIds, isActive } = parsed.data;

    // Filtrer uniquement les FUNDRAISER existants
    const existing = await prisma.block.findMany({
      where: { id: { in: cagnotteIds }, type: "FUNDRAISER" },
      select: { id: true },
    });
    const existingIds = existing.map((b) => b.id);

    const { count: updatedCount } = await prisma.block.updateMany({
      where: { id: { in: existingIds } },
      data: { isActive },
    });

    await logAdminAction(
      req.admin!.id,
      isActive ? "CAGNOTTE_BULK_ACTIVATED" : "CAGNOTTE_BULK_DEACTIVATED",
      `cagnottes:${existingIds.length}`,
      {
        requestedIds: cagnotteIds,
        appliedIds: existingIds,
        count: updatedCount,
      },
      req.ip,
    );

    const failedIds = cagnotteIds.filter((id) => !existingIds.includes(id));
    res.json({
      ok: true,
      updated: updatedCount,
      succeededIds: existingIds,
      failedIds,
    });
  },
);

// ── PATCH /:id/toggle-visibility — Toggle config.visibility (public ↔ private) ──
cagnottesAdminRouter.patch("/:id/toggle-visibility", requireRole("ADMIN", "SUPER_ADMIN"), async (req, res) => {
  try {
    const id = req.params.id as string;

    const block = await prisma.block.findUnique({
      where: { id },
      select: { id: true, config: true, type: true },
    });
    if (!block || block.type !== "FUNDRAISER") {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const cfg = (block.config as Record<string, unknown>) || {};
    const currentVisibility = (cfg.visibility as string) || "public";
    const newVisibility = currentVisibility === "public" ? "private" : "public";

    await prisma.block.update({
      where: { id },
      data: {
        config: { ...cfg, visibility: newVisibility },
      },
    });

    await logAdminAction(
      req.admin!.id,
      `CAGNOTTE_VISIBILITY_${newVisibility.toUpperCase()}`,
      `block:${id}`,
      { from: currentVisibility, to: newVisibility },
      req.ip,
    );

    res.json({ success: true, visibility: newVisibility });
  } catch (err) {
    logger.error("admin:cagnottes:toggle-visibility", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PATCH /:id — Full admin edit of a FUNDRAISER cagnotte ──
// L'admin peut modifier tous les champs d'une cagnotte : titre, description,
// images (coverUrl + gallery), montant objectif, date de fin, visibilité,
// statut, masques, message de remerciement, etc.
//
// Payload partiel : seuls les champs fournis dans `config` sont mutés.
// La config complète est re-validée par `validateBlockConfig("FUNDRAISER")`
// pour garantir les invariants cross-field (subtype × occasion/cause × bénéficiaire).
//
// Le titre peut être fourni en `title` au root (aligne Block.title + config.title).
//
// Auth : SUPER_ADMIN uniquement — l'édition arbitraire d'une cagnotte
// d'autrui est un pouvoir sensible (peut réécrire l'histoire d'une campagne
// avec PAID orders). Les ADMIN réguliers gardent toggle-active / flag seller.
const updateCagnotteBodySchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  // config = patch partiel — merged avec la config existante puis re-validé
  config: z.record(z.string(), z.unknown()).optional(),
});

cagnottesAdminRouter.patch(
  "/:id",
  requireRole("SUPER_ADMIN"),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const parsed = updateCagnotteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Donnees invalides", details: parsed.error.flatten() });
        return;
      }
      const { title, config: configPatch } = parsed.data;

      if (!title && !configPatch) {
        res.status(400).json({ error: "Aucune modification fournie" });
        return;
      }

      const existing = await prisma.block.findUnique({
        where: { id },
        select: { id: true, title: true, config: true, type: true },
      });
      if (!existing || existing.type !== "FUNDRAISER") {
        res.status(404).json({ error: "Cagnotte introuvable" });
        return;
      }

      const existingCfg = (existing.config as Record<string, unknown>) || {};
      const mergedCfg: Record<string, unknown> = configPatch
        ? { ...existingCfg, ...configPatch }
        : existingCfg;

      // Override admin direct vers APPROVED — clear l'historique de rejet
      // pour rester cohérent avec /card-review (audit-039 C-5 follow-up).
      // Symétrie : sur transition vers REJECTED on archive l'ancienne raison
      // courante dans cardLastRejectionReason si elle existe.
      const prevCardStatus = existingCfg.cardStatus;
      const nextCardStatus = mergedCfg.cardStatus;
      if (
        nextCardStatus === "APPROVED" &&
        prevCardStatus !== "APPROVED"
      ) {
        mergedCfg.cardLastRejectionReason = null;
        mergedCfg.cardRejectionReason = null;
        if (!mergedCfg.cardReviewedAt) {
          mergedCfg.cardReviewedAt = new Date().toISOString();
        }
      }
      if (
        nextCardStatus === "REJECTED" &&
        prevCardStatus !== "REJECTED"
      ) {
        const incomingReason = (mergedCfg.cardRejectionReason as string | null | undefined) ?? null;
        mergedCfg.cardLastRejectionReason = incomingReason;
        if (!mergedCfg.cardReviewedAt) {
          mergedCfg.cardReviewedAt = new Date().toISOString();
        }
      }

      // Valide la config COMPLÈTE (pas juste le patch) — attrape les
      // invariants cross-field comme subtype=solidaire + occasion=anniversaire
      // (qui serait silencieusement accepté par un .partial()).
      let validatedCfg: Record<string, unknown>;
      try {
        validatedCfg = validateBlockConfig("FUNDRAISER", mergedCfg) as Record<string, unknown>;
      } catch (zodErr) {
        const msg = zodErr instanceof z.ZodError
          ? zodErr.flatten()
          : { error: "Config invalide", detail: String(zodErr) };
        res.status(400).json({ error: "Config invalide", details: msg });
        return;
      }

      // Calcule un diff compact pour l'audit log (juste les clés modifiées)
      const changedKeys: string[] = [];
      if (configPatch) {
        for (const k of Object.keys(configPatch)) {
          if (JSON.stringify(existingCfg[k]) !== JSON.stringify(validatedCfg[k])) {
            changedKeys.push(k);
          }
        }
      }
      const titleChanged = typeof title === "string" && title !== existing.title;

      // Cast via InputJsonValue — validatedCfg est un JSON plain object
      // validé par Zod (pas de Date, pas de BigInt), compatible avec la
      // colonne Prisma Json.
      const updateData: Prisma.BlockUpdateInput = {
        config: validatedCfg as Prisma.InputJsonValue,
      };
      if (titleChanged) updateData.title = title;
      // Si le config.title est fourni, l'aligner sur Block.title pour rester cohérent
      if (!titleChanged && typeof validatedCfg.title === "string" && validatedCfg.title !== existing.title) {
        updateData.title = validatedCfg.title;
      }

      const updated = await prisma.block.update({
        where: { id },
        data: updateData,
        select: { id: true, title: true, slug: true, config: true, isActive: true },
      });

      await logAdminAction(
        req.admin!.id,
        "CAGNOTTE_EDITED",
        `block:${id}`,
        {
          changedKeys,
          titleChanged,
          previousTitle: titleChanged ? existing.title : undefined,
          newTitle: titleChanged ? title : undefined,
        },
        req.ip,
      );

      res.json({ ok: true, cagnotte: updated });
    } catch (err) {
      logger.error("admin:cagnottes:edit", err);
      res.status(500).json({ error: "Erreur interne" });
    }
  },
);

// ── POST /:id/card-review — Approuver / rejeter la demande carte bancaire ──
//
// Le creator soumet une demande via PATCH /api/blocks/:id (cardStatus:
// REQUESTED). L'admin la traite ici. Précondition d'approbation : le seller
// doit avoir kycStatus === "APPROVED" (sinon 403 KYC_REQUIRED — UX : le
// bouton est désactivé côté front avec un tooltip).
//
// Race protection : updateMany filtré sur cardStatus=REQUESTED ; si deux
// admins traitent en parallèle, le second reçoit count=0 → 409.
//
// Auth : ADMIN ou SUPER_ADMIN.
const cardReviewBodySchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    // Trim + collapse multi-whitespace pour éviter les raisons full-blank
    // ou bourrées de \n qui s'affichent mal en email/UI (audit-039 A-3).
    reason: z
      .string()
      .max(500)
      .transform((v) => v.trim().replace(/\s+/g, " "))
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED") {
      if (!data.reason || data.reason.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason"],
          message: "Raison du rejet requise (≥5 caractères, hors espaces)",
        });
      }
    }
  });

cagnottesAdminRouter.post(
  "/:id/card-review",
  requireRole("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const id = req.params.id as string;
      const parsed = cardReviewBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
        return;
      }
      const { status, reason } = parsed.data;

      const existing = await prisma.block.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          title: true,
          slug: true,
          config: true,
          sellerId: true,
          seller: { select: { id: true, slug: true, kycStatus: true } },
        },
      });
      if (!existing || existing.type !== "FUNDRAISER") {
        res.status(404).json({ error: "Cagnotte introuvable" });
        return;
      }

      // KYC gate — seul l'approbation est bloquée. Le rejet est toujours
      // possible (un admin peut rejeter une demande pré-KYC).
      if (status === "APPROVED" && existing.seller?.kycStatus !== "APPROVED") {
        res.status(403).json({
          error: "Le KYC du créateur doit être validé avant d'activer la carte",
          code: "KYC_REQUIRED",
        });
        return;
      }

      const existingCfg = (existing.config as Record<string, unknown>) || {};
      const previousReason = (existingCfg.cardRejectionReason as string | null) ?? null;
      const reviewedAt = new Date().toISOString();
      const mergedCfg: Record<string, unknown> = {
        ...existingCfg,
        cardStatus: status,
        cardReviewedAt: reviewedAt,
        cardRejectionReason: status === "REJECTED" ? (reason ?? null) : null,
        // Archive la dernière raison de rejet pour traçabilité après re-soumission.
        // Sur APPROVED on clear l'historique : la cagnotte est désormais validée
        // et l'ancienne raison ne doit plus rester côté creator (audit-039 C-5).
        cardLastRejectionReason:
          status === "APPROVED"
            ? null
            : status === "REJECTED"
              ? (reason ?? null)
              : previousReason,
      };

      // Re-validation complète Zod — attrape les invariants cross-field.
      // Si elle échoue ici c'est que la config existante du block est déjà
      // invalide (legacy data) — ce n'est pas une erreur serveur, donc on
      // renvoie 422 avec un code que l'admin peut comprendre (audit-039 A-7).
      let validatedCfg: Record<string, unknown>;
      try {
        validatedCfg = validateBlockConfig("FUNDRAISER", mergedCfg) as Record<string, unknown>;
      } catch (zodErr) {
        const msg = zodErr instanceof z.ZodError ? zodErr.flatten() : { detail: String(zodErr) };
        res.status(422).json({
          error: "Config invalide après merge — éditez le bloc avant d'approuver",
          code: "CONFIG_INVALID_AFTER_MERGE",
          details: msg,
        });
        return;
      }

      // Race protection : seulement traiter si encore REQUESTED. Si deux
      // admins approuvent en parallèle, le second reçoit count=0 → 409.
      const result = await prisma.block.updateMany({
        where: {
          id,
          type: "FUNDRAISER",
          config: { path: ["cardStatus"], equals: "REQUESTED" },
        },
        data: { config: validatedCfg as Prisma.InputJsonValue },
      });
      if (result.count === 0) {
        res.status(409).json({
          error: "Demande déjà traitée ou inexistante",
          code: "ALREADY_REVIEWED",
        });
        return;
      }

      await logAdminAction(
        req.admin!.id,
        status === "APPROVED" ? "CARD_APPROVED" : "CARD_REJECTED",
        `block:${id}`,
        {
          sellerSlug: existing.seller?.slug,
          reason: status === "REJECTED" ? reason : undefined,
        },
        req.ip,
      );

      // Notifications post-commit (in-app + email transactionnel).
      // dedupeKey scoped au block (approval) ou à reviewedAt (rejection)
      // pour permettre re-soumission après rejet sans collision dedupe.
      // Slug du block requis pour les CTAs des templates email.
      if (existing.slug) {
        const blockForDispatch = {
          id: existing.id,
          sellerId: existing.sellerId,
          title: existing.title,
          slug: existing.slug,
        };
        if (status === "APPROVED") {
          fireCardApproved(blockForDispatch, reviewedAt).catch((err) =>
            logger.error("admin:cagnottes:card-review fireCardApproved", err),
          );
        } else {
          fireCardRejected(blockForDispatch, reason ?? "", reviewedAt).catch((err) =>
            logger.error("admin:cagnottes:card-review fireCardRejected", err),
          );
        }
      }

      res.json({ ok: true, cardStatus: status, cardReviewedAt: reviewedAt });
    } catch (err) {
      logger.error("admin:cagnottes:card-review", err);
      res.status(500).json({ error: "Erreur interne" });
    }
  },
);
