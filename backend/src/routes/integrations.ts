import { Router } from "express";
import { z } from "zod";
import { google } from "googleapis";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyCsrf, JWT_SECRET_BYTES } from "../lib/auth.js";
import { createOAuth2Client } from "../lib/google-calendar.js";
import { connectEmailMarketing, disconnectEmailMarketing, validateAndFetchLists, systemeioFetchCourses, type EmailProvider } from "../lib/email-marketing.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";

export const integrationsRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Scopes nécessaires pour Calendar + Meet auto-creation
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

// ── GET /api/integrations/google/connect — Redirige vers Google OAuth consent ──
integrationsRouter.get("/google/connect", requireAuth, async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALENDAR_REDIRECT_URI) {
      res.status(503).json({ error: "L'intégration Google Calendar n'est pas encore configurée." });
      return;
    }

    const oauth2Client = createOAuth2Client();

    // Signer le state pour empêcher le spoofing de sellerId dans le callback
    const stateToken = await new SignJWT({ sub: req.seller!.sub })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(JWT_SECRET_BYTES);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
      state: stateToken,
    });

    res.json({ authUrl });
  } catch (err) {
    logger.error("Erreur Google OAuth connect", err);
    res.status(500).json({ error: "Erreur lors de la connexion Google" });
  }
});

// ── GET /api/integrations/google/callback — Échange le code contre les tokens ──
integrationsRouter.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=error&reason=missing_params`);
      return;
    }

    // Vérifier et décoder le state signé (anti-CSRF)
    let sellerId: string;
    try {
      const { payload } = await jwtVerify(state, JWT_SECRET_BYTES);
      sellerId = payload.sub as string;
      if (!sellerId) throw new Error("Missing sub");
    } catch {
      res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=error&reason=invalid_state`);
      return;
    }

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true },
    });

    if (!seller) {
      res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=error&reason=invalid_seller`);
      return;
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      logger.error("[Google Calendar] Pas de refresh_token reçu — l'utilisateur a peut-être déjà connecté sans révoquer");
      res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=error&reason=no_refresh_token`);
      return;
    }

    // Obtenir l'email du compte Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || "unknown";

    // Chiffrer le refresh token avant stockage
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Upsert : créer ou mettre à jour l'intégration
    await prisma.googleIntegration.upsert({
      where: { sellerId: seller.id },
      create: {
        sellerId: seller.id,
        email,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        email,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connectedAt: new Date(),
      },
    });

    logger.log(`[Google Calendar] Intégration connectée — sellerId=${seller.id}, email=${email}`);
    res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=success`);
  } catch (err) {
    logger.error("Erreur Google OAuth callback", err);
    res.redirect(`${FRONTEND_URL}/dashboard/settings/integrations?google=error&reason=callback_failed`);
  }
});

// ── GET /api/integrations/google/status — Statut de connexion ──
integrationsRouter.get("/google/status", requireAuth, async (req, res) => {
  try {
    const integration = await prisma.googleIntegration.findUnique({
      where: { sellerId: req.seller!.sub },
      select: { email: true, connectedAt: true, calendarId: true },
    });

    if (!integration) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      email: integration.email,
      connectedAt: integration.connectedAt,
      calendarId: integration.calendarId,
    });
  } catch (err) {
    logger.error("Erreur Google status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /api/integrations/google/disconnect — Supprimer l'intégration ──
integrationsRouter.delete("/google/disconnect", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const deleted = await prisma.googleIntegration.deleteMany({
      where: { sellerId: req.seller!.sub },
    });

    if (deleted.count === 0) {
      res.status(404).json({ error: "Aucune intégration Google à déconnecter" });
      return;
    }

    logger.log(`[Google Calendar] Intégration déconnectée — sellerId=${req.seller!.sub}`);
    res.json({ success: true });
  } catch (err) {
    logger.error("Erreur Google disconnect", err);
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
});

// ═══════════════════════════════════════════════
// EMAIL MARKETING — Brevo, Systeme.io
// ═══════════════════════════════════════════════

const emailConnectSchema = z.object({
  provider: z.enum(["brevo", "systemeio"]),
  apiKey: z.string().min(5).max(500),
  listId: z.string().max(100).optional(),
  syncEvents: z.enum(["all", "clients", "leads"]).optional(),
});

// ── POST /api/integrations/email/connect — Connecter un outil email marketing ──
integrationsRouter.post("/email/connect", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const data = emailConnectSchema.parse(req.body);
    const sellerId = req.seller!.sub;

    const result = await connectEmailMarketing(sellerId, {
      provider: data.provider as EmailProvider,
      apiKey: data.apiKey,
      listId: data.listId,
      syncEvents: data.syncEvents,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur email marketing connect", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/integrations/email/lists — Valider clé API + récupérer les listes ──
integrationsRouter.post("/email/lists", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const data = emailConnectSchema.pick({ provider: true, apiKey: true }).parse(req.body);

    const result = await validateAndFetchLists({
      provider: data.provider as EmailProvider,
      apiKey: data.apiKey,
    });

    if (!result.valid) {
      res.status(400).json({ error: result.error, lists: [] });
      return;
    }

    res.json({ lists: result.lists });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur email marketing lists", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/integrations/email/status — Statut de connexion ──
integrationsRouter.get("/email/status", requireAuth, async (req, res) => {
  try {
    const integration = await prisma.emailMarketingIntegration.findUnique({
      where: { sellerId: req.seller!.sub },
      select: { provider: true, listId: true, syncEvents: true, connectedAt: true },
    });

    if (!integration) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      provider: integration.provider,
      listId: integration.listId,
      syncEvents: integration.syncEvents,
      connectedAt: integration.connectedAt,
    });
  } catch (err) {
    logger.error("Erreur email status", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/integrations/email/list — Mettre à jour la liste sélectionnée ──
integrationsRouter.put("/email/list", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const { listId } = z.object({ listId: z.string().max(100) }).parse(req.body);
    const sellerId = req.seller!.sub;

    const updated = await prisma.emailMarketingIntegration.updateMany({
      where: { sellerId },
      data: { listId },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: "Aucune intégration email connectée" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur email list update", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/integrations/email/sync-events — Mettre à jour le filtre de sync ──
integrationsRouter.put("/email/sync-events", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const { syncEvents } = z.object({ syncEvents: z.enum(["all", "clients", "leads"]) }).parse(req.body);
    const sellerId = req.seller!.sub;

    const updated = await prisma.emailMarketingIntegration.updateMany({
      where: { sellerId },
      data: { syncEvents },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: "Aucune intégration email connectée" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur email sync-events update", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /api/integrations/email/disconnect — Déconnecter l'outil email ──
integrationsRouter.delete("/email/disconnect", verifyCsrf, requireAuth, async (req, res) => {
  try {
    await disconnectEmailMarketing(req.seller!.sub);
    res.json({ success: true });
  } catch (err) {
    logger.error("Erreur email disconnect", err);
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
});

// ═══════════════════════════════════════════════
// SYSTEME.IO — Courses (for FORMATION block)
// ═══════════════════════════════════════════════

// ── GET /api/integrations/systemeio/courses — Lister les cours Systeme.io du vendeur ──
integrationsRouter.get("/systemeio/courses", requireAuth, async (req, res) => {
  try {
    const integration = await prisma.emailMarketingIntegration.findUnique({
      where: { sellerId: req.seller!.sub },
    });

    if (!integration || integration.provider !== "systemeio") {
      res.status(400).json({ error: "Aucune intégration Systeme.io connectée", courses: [] });
      return;
    }

    const apiKey = decrypt(integration.apiKey);
    const result = await systemeioFetchCourses(apiKey);

    if (result.error) {
      res.status(400).json({ error: result.error, courses: [] });
      return;
    }

    res.json({ courses: result.courses });
  } catch (err) {
    logger.error("Erreur fetch systemeio courses", err);
    res.status(500).json({ error: "Erreur interne", courses: [] });
  }
});

// ═══════════════════════════════════════════════
// TRACKING PIXELS — Meta, Google Ads, GA4, TikTok
// ═══════════════════════════════════════════════

// Platform-specific pixel ID validation (also prevents XSS via template literal injection)
const pixelSchema = z.object({
  metaPixelId: z.string().regex(/^\d{10,20}$/, "Meta Pixel ID : 10 à 20 chiffres").optional().nullable(),
  googleAdsId: z.string().regex(/^AW-[A-Za-z0-9_-]+$/, "Google Ads ID : format AW-XXXXXXXXX").optional().nullable(),
  googleAnalyticsId: z.string().regex(/^G-[A-Za-z0-9]+$/, "GA4 ID : format G-XXXXXXXXXX").optional().nullable(),
  tiktokPixelId: z.string().regex(/^C[A-Za-z0-9]+$/, "TikTok Pixel ID : format CXXXXXXXXX").optional().nullable(),
});

// ── GET /api/integrations/pixels — Récupérer les pixels du vendeur ──
integrationsRouter.get("/pixels", requireAuth, async (req, res) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: req.seller!.sub },
      select: {
        metaPixelId: true,
        googleAdsId: true,
        googleAnalyticsId: true,
        tiktokPixelId: true,
      },
    });

    res.json({
      metaPixelId: seller?.metaPixelId || null,
      googleAdsId: seller?.googleAdsId || null,
      googleAnalyticsId: seller?.googleAnalyticsId || null,
      tiktokPixelId: seller?.tiktokPixelId || null,
    });
  } catch (err) {
    logger.error("Erreur pixels GET", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/integrations/pixels — Sauvegarder les pixels ──
integrationsRouter.put("/pixels", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const data = pixelSchema.parse(req.body);
    const sellerId = req.seller!.sub;

    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        metaPixelId: data.metaPixelId?.trim() || null,
        googleAdsId: data.googleAdsId?.trim() || null,
        googleAnalyticsId: data.googleAnalyticsId?.trim() || null,
        tiktokPixelId: data.tiktokPixelId?.trim() || null,
      },
    });

    // Invalidate store cache so pixels appear immediately on public page
    try {
      const { invalidateStoreCache } = await import("./sellers.js");
      await invalidateStoreCache(sellerId);
    } catch { /* no-op */ }

    logger.log(`[Pixels] Mis à jour — sellerId=${sellerId}`);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur pixels PUT", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
