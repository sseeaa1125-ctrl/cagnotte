import { Router, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf, verifyToken } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { validateBlockConfig } from "../lib/blocks/schemas.js";
import { formatZodError } from "../lib/zodErrors.js";
import { invalidateStoreCache } from "./sellers.js";
import { slugify, ensureUniqueSlug } from "../lib/cagnottes/slug.js";

export const blocksRouter = Router();

const productSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200, "Titre trop long"),
  subtitle: z.string().max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().int().min(0),
  coverUrl: z.string().url().nullable().optional(),
  fileUrl: z.string().url().nullable().optional(),
  fileName: z.string().nullable().optional(),
  files: z.array(z.object({
    url: z.string().url(),
    fileName: z.string(),
    fileSize: z.number().int().optional(),
  })).nullable().optional(),
  redirectUrl: z.string().url().nullable().optional(),
  buttonText: z.string().max(30).optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).optional(),
  discountPrice: z.number().int().min(0).nullable().optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
  leadFields: z.array(z.object({
    id: z.string(),
    type: z.enum(["name", "email", "phone", "whatsapp", "custom"]),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean(),
  })).nullable().optional(),
  maxSubscribers: z.number().int().min(1).nullable().optional(),
  showSubscriberCount: z.boolean().optional(),
  systemeioCourseId: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  checkoutSections: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(["text", "faq", "features", "video"]),
    title: z.string().max(200).optional(),
    content: z.string().max(5000).optional(),
    items: z.array(z.object({
      question: z.string().max(500).optional(),
      answer: z.string().max(2000).optional(),
      text: z.string().max(500).optional(),
    })).optional(),
  })).nullable().optional(),
});

const bookingServiceSchema = z.object({
  title: z.string().min(1, "Titre requis").max(200, "Titre trop long"),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().int().min(500),
  duration: z.number().int().min(15),
  location: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  buttonText: z.string().max(30).nullable().optional(),
  ctaStyle: z.enum(["button", "callout", "preview"]).default("button").optional(),
  confirmationEmailSubject: z.string().nullable().optional(),
  confirmationEmailBody: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  checkoutSections: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(["text", "faq", "features", "video"]),
    title: z.string().max(200).optional(),
    content: z.string().max(5000).optional(),
    items: z.array(z.object({
      question: z.string().max(500).optional(),
      answer: z.string().max(2000).optional(),
      text: z.string().max(500).optional(),
    })).optional(),
  })).nullable().optional(),
});

const createBlockSchema = z.object({
  type: z.enum(["LINK", "SALE", "BOOKING", "PAYMENT", "DONATION", "FUNDRAISER", "FORMATION", "LEAD_MAGNET", "WAITING_LIST", "PARTNERSHIP"]),
  title: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  isActive: z.boolean().optional(),
  product: productSchema.optional(),
  bookingService: bookingServiceSchema.optional(),
});

const updateBlockSchema = z.object({
  title: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  product: productSchema.partial().optional(),
  bookingService: bookingServiceSchema.partial().optional(),
});

const reorderSchema = z.object({
  blockIds: z.array(z.string()),
});

// Shared includes for block queries
const blockIncludes = {
  product: {
    include: {
      reviews: { orderBy: { position: "asc" as const } },
      orderBumps: true,
    },
  },
  bookingService: {
    include: { slots: true },
  },
  community: {
    select: {
      id: true,
      sellerId: true,
      blockId: true,
      telegramChatTitle: true,
      title: true,
      description: true,
      coverUrl: true,
      priceAmount: true,
      currency: true,
      subscribeFields: true,
      isActive: true,
      memberCount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

// GET /api/blocks — liste des blocs du vendeur (auth requise)
blocksRouter.get("/", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    const blocks = await prisma.block.findMany({
      where: { sellerId },
      orderBy: { position: "asc" },
      include: blockIncludes,
    });

    res.json({ blocks });
  } catch (err) {
    logger.error("Erreur liste blocs", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/blocks/:id — un seul bloc (auth requise)
blocksRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const block = await prisma.block.findUnique({
      where: { id: req.params.id as string },
      include: blockIncludes,
    });
    if (!block || block.sellerId !== sellerId) {
      res.status(404).json({ error: "Bloc introuvable" });
      return;
    }
    res.json({ block });
  } catch (err) {
    logger.error("Erreur get bloc", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/blocks/:id/progress — progression d'une cagnotte.
// Public endpoint, but hideAmount/hideDonors are enforced for non-owners.
// The creator (detected via optional izy-token cookie) always sees real
// numbers. Mirrors the owner-detection pattern in routes/cagnottes.ts.
blocksRouter.get("/:id/progress", async (req, res) => {
  try {
    const block = await prisma.block.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, type: true, config: true, sellerId: true, isActive: true },
    });

    if (!block || block.type !== "FUNDRAISER" || !block.isActive) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    const config = block.config as Record<string, unknown>;
    const goalAmount = (config.goalAmount as number) || 0;
    const hideAmount = config.hideAmount === true;
    const hideDonors = config.hideDonors === true;

    // Owner detection — optional cookie. If present and sub === sellerId,
    // bypass hideAmount/hideDonors so the dashboard card shows real totals.
    const cookieToken = (req.cookies?.["izy-token"] as string) ?? null;
    let isOwner = false;
    if (cookieToken) {
      const payload = await verifyToken(cookieToken);
      if (payload?.sub && payload.sub === block.sellerId) {
        isOwner = true;
      }
    }

    // Owner responses must never be cached (they carry unmasked data).
    if (isOwner) {
      res.setHeader("Cache-Control", "private, no-store");
    }

    const stats = await prisma.order.aggregate({
      where: {
        blockId: block.id,
        orderType: "DONATION",
        paymentStatus: "PAID",
      },
      _sum: { amount: true, voluntaryContribution: true },
      _count: true,
    });

    // Voluntary contribution goes 100% to the platform — subtract from the
    // creator-facing "Montant récolté" so the figure reflects the actual
    // cagnotte contribution, not the gross charged to the donor.
    const realCollected =
      (stats._sum.amount || 0) - (stats._sum.voluntaryContribution || 0);
    const realDonorCount = stats._count || 0;

    const collected = isOwner || !hideAmount ? realCollected : null;
    const donorCount = isOwner || !hideDonors ? realDonorCount : null;
    // Percentage is derived from the real number only when amount is visible.
    const percentage =
      collected !== null && goalAmount > 0
        ? Math.min(Math.round((collected / goalAmount) * 100), 100)
        : null;

    res.json({
      goalAmount,
      collected,
      donorCount,
      percentage,
      endDate: (config.endDate as string) || null,
      hideAmount,
      hideDonors,
    });
  } catch (err) {
    logger.error("Erreur progress cagnotte", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// GET /api/blocks/:id/donations — 10 derniers dons d'une cagnotte (public)
blocksRouter.get("/:id/donations", async (req, res) => {
  try {
    const block = await prisma.block.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, type: true, isActive: true, config: true },
    });

    if (!block || block.type !== "FUNDRAISER" || !block.isActive) {
      res.status(404).json({ error: "Cagnotte introuvable" });
      return;
    }

    // Audit 032 S-02 — respect hideAmount config flag
    const config = block.config as Record<string, unknown> | null;
    const hideAmount = config?.hideAmount === true;

    const donations = await prisma.order.findMany({
      where: {
        blockId: block.id,
        orderType: "DONATION",
        paymentStatus: "PAID",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        voluntaryContribution: true,
        customerName: true,
        donorMessage: true,
        isAnonymous: true,
        messageIsPrivate: true,
        createdAt: true,
      },
    });

    // Audit 030 HI-01 — respect isAnonymous / messageIsPrivate flags
    // Audit 032 S-02 — respect hideAmount flag
    // Voluntary contribution is platform-bound; show cagnotte-only amount.
    res.json({
      donations: donations.map((d) => ({
        id: d.id,
        amount: hideAmount
          ? null
          : d.amount - (d.voluntaryContribution ?? 0),
        name: d.isAnonymous ? "Anonyme" : (d.customerName || "Anonyme"),
        message: d.messageIsPrivate ? null : (d.donorMessage || null),
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    logger.error("Erreur donations cagnotte", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// Limites par plan — temporairement désactivées (sera configuré via admin dashboard)
const PLAN_LIMITS = {
  FREE: { maxBlocks: Infinity, maxSaleBlocks: Infinity, maxBookingBlocks: Infinity },
  PRO: { maxBlocks: Infinity, maxSaleBlocks: Infinity, maxBookingBlocks: Infinity },
} as const;

// POST /api/blocks — créer un bloc (auth requise)
blocksRouter.post("/", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const plan = req.seller!.plan || "FREE";
    const data = createBlockSchema.parse(req.body);

    // Vérifier les limites du plan
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.FREE;
    const existingBlocks = await prisma.block.findMany({
      where: { sellerId },
      select: { type: true },
    });

    if (existingBlocks.length >= limits.maxBlocks) {
      res.status(403).json({
        error: `Limite atteinte : ${limits.maxBlocks} blocs max sur le plan ${plan}. Passe au Pro pour débloquer.`,
      });
      return;
    }

    if (["SALE", "FORMATION", "LEAD_MAGNET", "WAITING_LIST", "PARTNERSHIP"].includes(data.type)) {
      const saleCount = existingBlocks.filter((b) => ["SALE", "FORMATION", "LEAD_MAGNET", "WAITING_LIST", "PARTNERSHIP"].includes(b.type)).length;
      if (saleCount >= limits.maxSaleBlocks) {
        res.status(403).json({
          error: `Limite atteinte : ${limits.maxSaleBlocks} bloc(s) vente max sur le plan ${plan}.`,
        });
        return;
      }
    }

    if (data.type === "BOOKING") {
      const bookingCount = existingBlocks.filter((b) => b.type === "BOOKING").length;
      if (bookingCount >= limits.maxBookingBlocks) {
        res.status(403).json({
          error: `Limite atteinte : ${limits.maxBookingBlocks} bloc(s) réservation max sur le plan ${plan}.`,
        });
        return;
      }
    }

    // Bloc SALE actif : le fichier digital est obligatoire (sauf si redirectUrl) — les brouillons passent
    const hasFiles = data.product?.fileUrl || (data.product?.files && data.product.files.length > 0);
    if (data.type === "SALE" && data.isActive !== false && data.product && !hasFiles && !data.product.redirectUrl) {
      res.status(400).json({ error: "Le fichier digital ou l'URL de redirection est obligatoire" });
      return;
    }

    // Position = dernier + 1
    const lastBlock = await prisma.block.findFirst({
      where: { sellerId },
      orderBy: { position: "desc" },
    });
    const position = (lastBlock?.position ?? -1) + 1;

    // Bloc SALE sans fichier → forcé inactif ; sinon respecter isActive du client (Brouillon)
    const hasAnyFile = data.product?.fileUrl || (data.product?.files && data.product.files.length > 0);
    const saleNoFile = data.type === "SALE" && (!hasAnyFile && !data.product?.redirectUrl);
    const shouldBeActive = saleNoFile ? false : (data.isActive ?? true);

    // S10: Validate config only for types that carry meaningful config data
    // SALE/BOOKING/LEAD_MAGNET/WAITING_LIST use config: {} at creation (product/service created separately)
    const typesWithConfig = ["LINK", "PAYMENT", "DONATION", "FUNDRAISER", "PARTNERSHIP"];

    // Garde-fou carte bancaire — à la création, le creator ne peut envoyer
    // que cardStatus="NONE" ou "REQUESTED". Les états admin (APPROVED /
    // REJECTED) sont rejetés (privilege escalation). Si REQUESTED, on
    // timestamp automatiquement.
    if (data.type === "FUNDRAISER" && data.config && typeof data.config === "object") {
      const cfg = data.config as Record<string, unknown>;
      if (cfg.cardStatus === "APPROVED" || cfg.cardStatus === "REJECTED") {
        res.status(403).json({
          error: "Seul un admin peut activer ou rejeter le paiement par carte",
          code: "CARD_STATUS_FORBIDDEN",
        });
        return;
      }
      if (cfg.cardStatus === "REQUESTED") {
        cfg.cardRequestedAt = new Date().toISOString();
        // Reset des champs review au cas où le client en aurait envoyé.
        cfg.cardReviewedAt = null;
        cfg.cardRejectionReason = null;
      }
    }

    const validatedConfig = typesWithConfig.includes(data.type)
      ? validateBlockConfig(data.type, data.config)
      : (data.config || {});

    // Phase 2 plan 02-01 — FUNDRAISER blocks get a unique human-readable slug
    // generated from the title via the Phase 1 helper. ensureUniqueSlug retries
    // on P2002 (numeric suffix), and slugify() handles diacritics + reserved-word
    // collisions are resolved by the helper's internal start-candidate logic.
    // Non-FUNDRAISER block types skip slug generation entirely (slug stays NULL).
    let block: Awaited<ReturnType<typeof prisma.block.create>> | null = null;
    if (data.type === "FUNDRAISER") {
      const baseSlug = slugify(data.title);
      const finalSlug = await ensureUniqueSlug(baseSlug, async (candidate) => {
        block = await prisma.block.create({
          data: {
            sellerId,
            type: data.type,
            title: data.title,
            config: JSON.parse(JSON.stringify(validatedConfig)),
            position,
            isActive: shouldBeActive,
            slug: candidate,
          },
        });
      });
      // finalSlug is captured by ensureUniqueSlug for logging/debug; the block
      // already has it persisted via the closure above.
      void finalSlug;
    } else {
      block = await prisma.block.create({
        data: {
          sellerId,
          type: data.type,
          title: data.title,
          config: JSON.parse(JSON.stringify(validatedConfig)),
          position,
          isActive: shouldBeActive,
        },
      });
    }
    if (!block) {
      // Defensive — ensureUniqueSlug always either calls createFn successfully
      // or throws, so this branch should be unreachable. Kept as a tripwire.
      throw new Error("Block creation closure did not produce a block");
    }

    // Create nested product if SALE, FORMATION, LEAD_MAGNET, or WAITING_LIST
    const typesWithProduct = ["SALE", "FORMATION", "LEAD_MAGNET", "WAITING_LIST"];
    if (typesWithProduct.includes(data.type) && data.product) {
      const defaultBtn = data.type === "FORMATION" ? "Accéder" : data.type === "LEAD_MAGNET" ? "Recevoir" : data.type === "WAITING_LIST" ? "S'inscrire" : "Acheter";
      await prisma.product.create({
        data: {
          blockId: block.id,
          title: data.product.title,
          subtitle: data.product.subtitle || null,
          description: data.product.description || null,
          price: data.product.price,
          coverUrl: data.product.coverUrl || null,
          fileUrl: data.product.fileUrl || null,
          fileName: data.product.fileName || null,
          files: data.product.files ?? undefined,
          redirectUrl: data.product.redirectUrl || null,
          buttonText: data.product.buttonText || defaultBtn,
          ctaStyle: data.product.ctaStyle || "button",
          discountPrice: data.product.discountPrice ?? null,
          confirmationEmailSubject: data.product.confirmationEmailSubject || null,
          confirmationEmailBody: data.product.confirmationEmailBody || null,
          leadFields: data.product.leadFields ?? undefined,
          maxSubscribers: data.product.maxSubscribers ?? undefined,
          showSubscriberCount: data.product.showSubscriberCount ?? true,
          videoUrl: data.product.videoUrl || null,
          checkoutSections: data.product.checkoutSections ?? undefined,
          systemeioCourseId: data.product.systemeioCourseId || null,
        },
      });
    }

    // Create nested bookingService if BOOKING
    if (data.type === "BOOKING" && data.bookingService) {
      await prisma.bookingService.create({
        data: {
          blockId: block.id,
          title: data.bookingService.title,
          description: data.bookingService.description || null,
          price: data.bookingService.price,
          duration: data.bookingService.duration,
          location: data.bookingService.location || null,
          coverUrl: data.bookingService.coverUrl || null,
          buttonText: data.bookingService.buttonText || "Réserver",
          ctaStyle: data.bookingService.ctaStyle || "button",
          confirmationEmailSubject: data.bookingService.confirmationEmailSubject || null,
          confirmationEmailBody: data.bookingService.confirmationEmailBody || null,
          videoUrl: data.bookingService.videoUrl || null,
          checkoutSections: data.bookingService.checkoutSections ?? undefined,
        },
      });
    }

    // Re-fetch with includes
    const fullBlock = await prisma.block.findUnique({
      where: { id: block.id },
      include: blockIncludes,
    });

    await invalidateStoreCache(sellerId);
    res.status(201).json({ block: fullBlock });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const field = err.errors[0].path.join(".");
      const msg = err.errors[0].message;
      logger.error("Zod validation bloc", { field, msg, body: JSON.stringify(req.body).slice(0, 500) });
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur création bloc", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PUT /api/blocks/:id — modifier un bloc (auth requise)
blocksRouter.put("/:id", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = updateBlockSchema.parse(req.body);

    const blockId = req.params.id as string;
    const existing = await prisma.block.findUnique({
      where: { id: blockId },
    });
    if (!existing || existing.sellerId !== sellerId) {
      res.status(404).json({ error: "Bloc introuvable" });
      return;
    }

    // S10: Validate config on update only for types with meaningful config
    const typesWithConfigUpdate = ["LINK", "PAYMENT", "DONATION", "FUNDRAISER", "FORMATION", "PARTNERSHIP"];

    // Garde-fou carte bancaire (privilege escalation) :
    // - Le creator ne peut PAS *transitionner* cardStatus vers APPROVED ou
    //   REJECTED. Renvoyer la valeur existante (cas du form qui POSTe le
    //   config complet) est OK et ne déclenche pas le guard.
    // - Sur transition NONE|REJECTED → REQUESTED, on timestamp + on archive
    //   l'éventuelle ancienne raison de rejet dans cardLastRejectionReason
    //   et on clear cardRejectionReason / cardReviewedAt (nouveau cycle).
    if (
      existing.type === "FUNDRAISER" &&
      data.config &&
      typeof data.config === "object"
    ) {
      const incoming = data.config as Record<string, unknown>;
      const previousCfg = (existing.config as Record<string, unknown>) || {};
      const incomingStatus = incoming.cardStatus;
      const previousStatus = previousCfg.cardStatus;
      // Bloque uniquement les vraies transitions privilégiées : le creator
      // n'a le droit ni de promouvoir une demande NONE/REQUESTED → APPROVED
      // ni de poser un REJECTED de sa propre main. Si la valeur entrante
      // EST DÉJÀ celle stockée, le form ne fait que repasser l'état actuel
      // (cas typique de l'édition visibility/title pendant qu'une carte
      // est déjà APPROVED) — laisser passer.
      const isPrivilegedTransition =
        (incomingStatus === "APPROVED" || incomingStatus === "REJECTED") &&
        incomingStatus !== previousStatus;
      if (isPrivilegedTransition) {
        res.status(403).json({
          error: "Seul un admin peut activer ou rejeter le paiement par carte",
          code: "CARD_STATUS_FORBIDDEN",
        });
        return;
      }
      const wasNoneOrRejected =
        previousStatus === undefined ||
        previousStatus === "NONE" ||
        previousStatus === "REJECTED";
      if (incomingStatus === "REQUESTED" && wasNoneOrRejected) {
        incoming.cardRequestedAt = new Date().toISOString();
        // Archive la raison du dernier rejet (si re-soumission après rejet).
        if (previousStatus === "REJECTED" && previousCfg.cardRejectionReason) {
          incoming.cardLastRejectionReason = previousCfg.cardRejectionReason;
        }
        // Nouveau cycle : clear les champs de review.
        incoming.cardReviewedAt = null;
        incoming.cardRejectionReason = null;
      }
    }

    const validatedUpdateConfig = data.config && typesWithConfigUpdate.includes(existing.type)
      ? validateBlockConfig(existing.type, data.config)
      : data.config;

    const block = await prisma.block.update({
      where: { id: blockId },
      data: {
        ...(data.title && { title: data.title }),
        ...(validatedUpdateConfig && { config: JSON.parse(JSON.stringify(validatedUpdateConfig)) as never }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { product: true, bookingService: true },
    });

    // Update nested product if provided
    if (data.product && block.product) {
      await prisma.product.update({
        where: { id: block.product.id },
        data: {
          ...(data.product.title !== undefined && { title: data.product.title }),
          ...(data.product.subtitle !== undefined && { subtitle: data.product.subtitle }),
          ...(data.product.description !== undefined && { description: data.product.description }),
          ...(data.product.price !== undefined && { price: data.product.price }),
          ...(data.product.coverUrl !== undefined && { coverUrl: data.product.coverUrl }),
          ...(data.product.fileUrl !== undefined && { fileUrl: data.product.fileUrl }),
          ...(data.product.fileName !== undefined && { fileName: data.product.fileName }),
          ...(data.product.files !== undefined && { files: data.product.files === null ? Prisma.JsonNull : data.product.files }),
          ...(data.product.redirectUrl !== undefined && { redirectUrl: data.product.redirectUrl }),
          ...(data.product.buttonText !== undefined && { buttonText: data.product.buttonText }),
          ...(data.product.ctaStyle !== undefined && { ctaStyle: data.product.ctaStyle }),
          ...(data.product.discountPrice !== undefined && { discountPrice: data.product.discountPrice }),
          ...(data.product.confirmationEmailSubject !== undefined && { confirmationEmailSubject: data.product.confirmationEmailSubject }),
          ...(data.product.confirmationEmailBody !== undefined && { confirmationEmailBody: data.product.confirmationEmailBody }),
          ...(data.product.leadFields !== undefined && { leadFields: data.product.leadFields === null ? Prisma.JsonNull : data.product.leadFields }),
          ...(data.product.maxSubscribers !== undefined && { maxSubscribers: data.product.maxSubscribers }),
          ...(data.product.showSubscriberCount !== undefined && { showSubscriberCount: data.product.showSubscriberCount }),
          ...(data.product.videoUrl !== undefined && { videoUrl: data.product.videoUrl }),
          ...(data.product.checkoutSections !== undefined && { checkoutSections: data.product.checkoutSections === null ? Prisma.JsonNull : data.product.checkoutSections }),
          ...(data.product.systemeioCourseId !== undefined && { systemeioCourseId: data.product.systemeioCourseId }),
        },
      });
    }

    // Update nested bookingService if provided
    if (data.bookingService && block.bookingService) {
      logger.log("[PUT block] bookingService received:", JSON.stringify(data.bookingService));
      await prisma.bookingService.update({
        where: { id: block.bookingService.id },
        data: {
          ...(data.bookingService.title !== undefined && { title: data.bookingService.title }),
          ...(data.bookingService.description !== undefined && { description: data.bookingService.description }),
          ...(data.bookingService.price !== undefined && { price: data.bookingService.price }),
          ...(data.bookingService.duration !== undefined && { duration: data.bookingService.duration }),
          ...(data.bookingService.location !== undefined && { location: data.bookingService.location }),
          ...(data.bookingService.coverUrl !== undefined && { coverUrl: data.bookingService.coverUrl }),
          ...(data.bookingService.buttonText !== undefined && { buttonText: data.bookingService.buttonText }),
          ...(data.bookingService.ctaStyle !== undefined && { ctaStyle: data.bookingService.ctaStyle }),
          ...(data.bookingService.confirmationEmailSubject !== undefined && { confirmationEmailSubject: data.bookingService.confirmationEmailSubject }),
          ...(data.bookingService.confirmationEmailBody !== undefined && { confirmationEmailBody: data.bookingService.confirmationEmailBody }),
          ...(data.bookingService.videoUrl !== undefined && { videoUrl: data.bookingService.videoUrl }),
          ...(data.bookingService.checkoutSections !== undefined && { checkoutSections: data.bookingService.checkoutSections === null ? Prisma.JsonNull : data.bookingService.checkoutSections }),
        },
      });
    }

    // Re-fetch with updated includes
    const updatedBlock = await prisma.block.findUnique({
      where: { id: blockId },
      include: blockIncludes,
    });

    await invalidateStoreCache(sellerId);
    res.json({ block: updatedBlock });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur update bloc", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// DELETE /api/blocks/:id — supprimer un bloc (auth requise)
blocksRouter.delete("/:id", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    const blockId = req.params.id as string;
    const existing = await prisma.block.findUnique({
      where: { id: blockId },
    });
    if (!existing || existing.sellerId !== sellerId) {
      res.status(404).json({ error: "Bloc introuvable" });
      return;
    }

    await prisma.block.delete({ where: { id: blockId } });

    await invalidateStoreCache(sellerId);
    res.json({ success: true });
  } catch (err) {
    logger.error("Erreur suppression bloc", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PUT /api/blocks/:id/slots — gérer les créneaux d'un booking service (auth requise)
// L6: Compare times numerically, not lexicographically
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const slotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
}).refine(
  (s) => timeToMinutes(s.startTime) < timeToMinutes(s.endTime),
  { message: "L'heure de début doit être avant l'heure de fin" }
);

const slotsUpdateSchema = z.object({
  slots: z.array(slotSchema),
});

blocksRouter.put("/:id/slots", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const blockId = req.params.id as string;
    const { slots } = slotsUpdateSchema.parse(req.body);

    const block = await prisma.block.findUnique({
      where: { id: blockId },
      include: { bookingService: true },
    });

    if (!block || block.sellerId !== sellerId) {
      res.status(404).json({ error: "Bloc introuvable" });
      return;
    }
    if (!block.bookingService) {
      res.status(400).json({ error: "Ce bloc n'a pas de service de réservation" });
      return;
    }

    const serviceId = block.bookingService.id;

    // Atomic delete + recreate in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.bookingSlot.deleteMany({
        where: { bookingServiceId: serviceId },
      });

      if (slots.length > 0) {
        await tx.bookingSlot.createMany({
          data: slots.map((s) => ({
            bookingServiceId: serviceId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    });

    const updatedSlots = await prisma.bookingSlot.findMany({
      where: { bookingServiceId: serviceId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    res.json({ slots: updatedSlots });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur update slots", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PATCH /api/blocks/reorder — réordonner les blocs (auth requise)
blocksRouter.patch("/reorder", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const { blockIds } = reorderSchema.parse(req.body);

    await prisma.$transaction(
      blockIds.map((id, index) =>
        prisma.block.updateMany({
          where: { id, sellerId },
          data: { position: index },
        })
      )
    );

    await invalidateStoreCache(sellerId);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur reorder blocs", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// =============================================
// REVIEWS — Avis clients (gérés par le vendeur)
// =============================================

const reviewSchema = z.object({
  name: z.string().min(1).max(100),
  text: z.string().min(1).max(500),
  rating: z.number().int().min(1).max(5).default(5),
  avatarUrl: z.string().nullable().optional(),
});

// Helper: verify block ownership and get product
async function getOwnedProduct(sellerId: string, blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: { product: true },
  });
  if (!block || block.sellerId !== sellerId) return null;
  return block.product;
}

// POST /api/blocks/:id/reviews — ajouter un avis
blocksRouter.post("/:id/reviews", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const data = reviewSchema.parse(req.body);

    const lastReview = await prisma.review.findFirst({
      where: { productId: product.id },
      orderBy: { position: "desc" },
    });

    const review = await prisma.review.create({
      data: {
        productId: product.id,
        name: data.name,
        text: data.text,
        rating: data.rating,
        avatarUrl: data.avatarUrl || null,
        position: (lastReview?.position ?? -1) + 1,
      },
    });

    res.status(201).json({ review });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur création review", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PUT /api/blocks/:id/reviews/:reviewId — modifier un avis
blocksRouter.put("/:id/reviews/:reviewId", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const data = reviewSchema.partial().parse(req.body);
    const review = await prisma.review.findFirst({
      where: { id: req.params.reviewId as string, productId: product.id },
    });
    if (!review) { res.status(404).json({ error: "Avis introuvable" }); return; }

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.text !== undefined && { text: data.text }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    res.json({ review: updated });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur update review", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// DELETE /api/blocks/:id/reviews/:reviewId — supprimer un avis
blocksRouter.delete("/:id/reviews/:reviewId", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const review = await prisma.review.findFirst({
      where: { id: req.params.reviewId as string, productId: product.id },
    });
    if (!review) { res.status(404).json({ error: "Avis introuvable" }); return; }

    await prisma.review.delete({ where: { id: review.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error("Erreur suppression review", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// =============================================
// ORDER BUMPS — Vente additionnelle au checkout
// =============================================

const orderBumpSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  price: z.number().int().min(0),
  fileUrl: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// POST /api/blocks/:id/bumps — ajouter un order bump
blocksRouter.post("/:id/bumps", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const data = orderBumpSchema.parse(req.body);

    const bump = await prisma.orderBump.create({
      data: {
        productId: product.id,
        title: data.title,
        description: data.description || null,
        price: data.price,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        isActive: data.isActive ?? true,
      },
    });

    res.status(201).json({ bump });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur création order bump", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// PUT /api/blocks/:id/bumps/:bumpId — modifier un order bump
blocksRouter.put("/:id/bumps/:bumpId", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const data = orderBumpSchema.partial().parse(req.body);
    const bump = await prisma.orderBump.findFirst({
      where: { id: req.params.bumpId as string, productId: product.id },
    });
    if (!bump) { res.status(404).json({ error: "Order bump introuvable" }); return; }

    const updated = await prisma.orderBump.update({
      where: { id: bump.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    res.json({ bump: updated });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: formatZodError(err) }); return; }
    logger.error("Erreur update order bump", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// DELETE /api/blocks/:id/bumps/:bumpId — supprimer un order bump
blocksRouter.delete("/:id/bumps/:bumpId", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const product = await getOwnedProduct(req.seller!.sub, req.params.id as string);
    if (!product) { res.status(404).json({ error: "Produit introuvable" }); return; }

    const bump = await prisma.orderBump.findFirst({
      where: { id: req.params.bumpId as string, productId: product.id },
    });
    if (!bump) { res.status(404).json({ error: "Order bump introuvable" }); return; }

    await prisma.orderBump.delete({ where: { id: bump.id } });
    res.json({ success: true });
  } catch (err) {
    logger.error("Erreur suppression order bump", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 10 — Close / reopen a FUNDRAISER cagnotte.
// Toggles `config.status` in the JSON blob (no Prisma migration needed).
// Closed cagnottes remain publicly visible; orders.ts rejects new donations
// and the public /c/[slug] page swaps the Participer CTA for a grey badge.
// ─────────────────────────────────────────────────────────────────────────────
async function setFundraiserStatus(
  blockId: string,
  sellerId: string,
  nextStatus: "active" | "closed",
  res: Response,
) {
  const existing = await prisma.block.findUnique({ where: { id: blockId } });
  if (!existing || existing.sellerId !== sellerId) {
    res.status(404).json({ error: "Cagnotte introuvable" });
    return;
  }
  if (existing.type !== "FUNDRAISER") {
    res.status(400).json({ error: "Ce bloc n'est pas une cagnotte" });
    return;
  }
  const currentConfig = (existing.config ?? {}) as Record<string, unknown>;
  const nextConfig = { ...currentConfig, status: nextStatus };
  // Re-validate through the FUNDRAISER schema so any drift is caught here.
  const validated = validateBlockConfig("FUNDRAISER", nextConfig);
  await prisma.block.update({
    where: { id: blockId },
    data: {
      config: JSON.parse(JSON.stringify(validated)) as never,
    },
  });
  res.json({ success: true, status: nextStatus });
}

blocksRouter.post("/:id/close", verifyCsrf, requireAuth, async (req, res) => {
  try {
    await setFundraiserStatus(req.params.id as string, req.seller!.sub, "closed", res);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur clôture cagnotte", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

blocksRouter.post("/:id/reopen", verifyCsrf, requireAuth, async (req, res) => {
  try {
    await setFundraiserStatus(req.params.id as string, req.seller!.sub, "active", res);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur réouverture cagnotte", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
