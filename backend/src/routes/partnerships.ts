import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf } from "../lib/auth.js";
import { cleanPhoneForStorage } from "../lib/phone.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

export const partnershipsRouter = Router();

// S19: Rate limit partnership submissions (3/min/IP) to prevent spam
const partnershipLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("partnership"),
  message: { error: "Trop de demandes. Réessaye dans une minute." },
});

// ── POST /api/partnerships — soumettre une demande (public) ──
const createPartnershipSchema = z.object({
  sellerSlug: z.string(),
  blockId: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  message: z.string().min(1).max(2000),
  budget: z.string().max(50).optional(),
});

partnershipsRouter.post("/", partnershipLimiter, async (req, res) => {
  try {
    const data = createPartnershipSchema.parse(req.body);
    data.sellerSlug = data.sellerSlug.toLowerCase();

    // NEW-V1: Exclude soft-deleted sellers
    const seller = await prisma.seller.findFirst({
      where: { slug: data.sellerSlug, deletedAt: null },
    });
    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    const block = await prisma.block.findUnique({
      where: { id: data.blockId },
    });
    if (!block || block.type !== "PARTNERSHIP" || block.sellerId !== seller.id) {
      res.status(400).json({ error: "Bloc introuvable" });
      return;
    }

    const request = await prisma.partnershipRequest.create({
      data: {
        blockId: data.blockId,
        sellerId: seller.id,
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone ? cleanPhoneForStorage(data.phone) : undefined,
        message: data.message,
        budget: data.budget,
      },
    });

    // Sync contact vers l'outil email marketing du vendeur (Brevo, Systeme.io)
    try {
      const { syncContactToProvider } = await import("../lib/email-marketing.js");
      const nameParts = (data.name || "").split(" ");
      await syncContactToProvider(seller.id, {
        email: data.email,
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(" ") || undefined,
        tags: ["partnership"],
      });
    } catch (syncErr) {
      logger.error(`[Partnership] Erreur sync email marketing`, syncErr);
    }

    // Email notification au vendeur
    try {
      const { queueStandardEmail } = await import("../lib/queues/index.js");
      const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
      const safeName = data.name.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c));
      const safeEmail = data.email.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c));
      const safeCompany = (data.company || "").replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c));
      const safeMessage = data.message.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c)).replace(/\n/g, "<br/>");

      queueStandardEmail({
        to: seller.email,
        subject: `🤝 Nouvelle demande de partenariat — ${data.name}`,
        html: `<h2>Nouvelle demande de partenariat</h2>
          <p><strong>${safeName}</strong>${safeCompany ? ` (${safeCompany})` : ""} souhaite collaborer avec toi.</p>
          <div style="margin:16px 0;padding:16px;background-color:#F9FAFB;border-radius:12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Nom</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${safeName}</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Email</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${safeEmail}</td></tr>
              ${safeCompany ? `<tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Entreprise</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${safeCompany}</td></tr>` : ""}
              ${data.budget ? `<tr><td style="padding:4px 0;font-size:14px;color:#6B7280;">Budget</td><td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">${data.budget.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c))}</td></tr>` : ""}
            </table>
          </div>
          <div style="margin:16px 0;padding:12px 16px;background-color:#F0FDFA;border-radius:10px;">
            <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#0D9488;">Message :</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">${safeMessage}</p>
          </div>
          <p><a href="${FRONTEND_URL}/dashboard/inbox" style="display:inline-block;padding:12px 24px;background-color:#0D9488;color:#FFFFFF;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">Voir dans ta boîte de réception</a></p>`,
      });
    } catch (emailErr) {
      logger.error(`[Partnership] Erreur email notification vendeur`, emailErr);
    }

    // Push notification au vendeur (PWA)
    try {
      const { sendPushToSeller } = await import("../lib/push-notifications.js");
      const prefs = (seller.notificationPrefs as Record<string, boolean> | null) || {};
      if (prefs.pushPartnerships !== false) {
        await sendPushToSeller(seller.id, {
          title: "Nouvelle demande de partenariat !",
          body: `${data.name}${data.company ? ` (${data.company})` : ""} souhaite collaborer avec toi`,
          url: "/dashboard/inbox",
          tag: `partnership-${request.id}`,
        });
      }
    } catch (pushErr) {
      logger.error(`[Partnership] Erreur push notification`, pushErr);
    }

    res.status(201).json({ id: request.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur création partnership", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── GET /api/partnerships — lister les demandes (auth) ──
partnershipsRouter.get("/", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const requests = await prisma.partnershipRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      include: {
        block: { select: { title: true } },
      },
    });

    res.json(requests);
  } catch (err) {
    logger.error("Erreur liste partnerships", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /api/partnerships/:id/status — accepter/refuser (auth) ──
const updateStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  message: z.string().min(1).max(5000), // Message personnalisé à envoyer au demandeur
});

partnershipsRouter.put("/:id/status", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const id = req.params.id as string;
    const data = updateStatusSchema.parse(req.body);

    const request = await prisma.partnershipRequest.findUnique({
      where: { id },
      include: { seller: { select: { displayName: true, email: true } } },
    });
    if (!request || request.sellerId !== sellerId) {
      res.status(404).json({ error: "Demande introuvable" });
      return;
    }

    const updated = await prisma.partnershipRequest.update({
      where: { id },
      data: { status: data.status },
    });

    // Envoyer l'email de réponse au demandeur
    try {
      const { queueStandardEmail } = await import("../lib/queues/index.js");
      const sellerName = request.seller?.displayName || "Le créateur";
      const safeSellerName = sellerName.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c));
      const safeMessage = data.message.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c)).replace(/\n/g, "<br/>");
      const safeName = request.name.replace(/[<>&"']/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#x27;" }[c] || c));

      const isAccepted = data.status === "ACCEPTED";
      const subject = isAccepted
        ? `🎉 Bonne nouvelle — ${sellerName} accepte ta demande de partenariat`
        : `Réponse à ta demande de partenariat — ${sellerName}`;

      const headerColor = isAccepted ? "#0D9488" : "#6B7280";
      const headerText = isAccepted ? "Demande acceptée !" : "Réponse à ta demande";

      queueStandardEmail({
        to: request.email,
        subject,
        html: `<div style="margin-bottom:24px;padding:16px;background-color:${isAccepted ? "#F0FDFA" : "#F9FAFB"};border-radius:12px;border-left:4px solid ${headerColor};">
            <p style="margin:0;font-size:16px;font-weight:700;color:${headerColor};">${headerText}</p>
          </div>
          <p>Salut ${safeName},</p>
          <div style="margin:20px 0;padding:16px;background-color:#F9FAFB;border-radius:12px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${safeMessage}</p>
          </div>
          <p style="margin-top:24px;font-size:14px;color:#6B7280;">— ${safeSellerName}</p>`,
      });
    } catch (emailErr) {
      logger.error(`[Partnership] Erreur envoi email réponse`, emailErr);
      // On ne bloque pas la réponse si l'email échoue
    }

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur update partnership status", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
