import { Router } from "express";
import { z } from "zod";
import { formatZodError } from "../lib/zodErrors.js";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  setCsrfCookie,
  clearCsrfCookie,
  verifyCsrf,
  verifyToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
} from "../lib/auth.js";
import { queueAuthEmail } from "../lib/queues/index.js";
import { requireAuth } from "../middleware/auth.js";
import { generateVerificationCode } from "../lib/utils.js";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/rateLimitStore.js";
import * as logger from "../lib/logger.js";
import { RESERVED_SLUGS } from "../lib/constants.js";

export const authRouter = Router();

// S7+S8: Timing-safe string comparison with length guard
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ── Zod schemas ──
const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Minimum 8 caractères").max(128, "Maximum 128 caractères"),
  displayName: z.string().min(2, "Minimum 2 caractères").max(50),
  slug: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(30)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Lettres minuscules, chiffres et tirets uniquement"),
});

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code à 6 chiffres"),
});

// M4: Slugs réservés partagés (routes système) — import en haut du fichier

// S3: Dedicated rate limiters for auth endpoints
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("signup"),
  message: { error: "Trop de tentatives d'inscription. Réessaye dans 15 minutes." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("login"),
  message: { error: "Trop de tentatives de connexion. Réessaye dans 15 minutes." },
});

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6, // SP2-2: Réduit de 10 à 6 — code 6 chiffres = 1M combinaisons, 6 essais suffisent
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("verify-email"),
  message: { error: "Trop de tentatives de vérification. Réessaye dans 15 minutes." },
});

// ── GET /api/auth/check-slug — Vérifier la disponibilité d'un slug ──
const checkSlugLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("check-slug"),
  message: { error: "Trop de vérifications. Patiente un peu." },
});
authRouter.get("/check-slug", checkSlugLimiter, async (req, res) => {
  try {
    const slug = (req.query.slug as string || "").toLowerCase().trim();
    if (!slug || slug.length < 3 || slug.length > 30 || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      res.json({ available: false });
      return;
    }
    if (RESERVED_SLUGS.has(slug)) {
      res.json({ available: false });
      return;
    }
    const existing = await prisma.seller.findUnique({ where: { slug }, select: { id: true } });
    res.json({ available: !existing });
  } catch {
    res.json({ available: false });
  }
});

// ── POST /api/auth/check-email — Vérifier si un email existe (pour le flow unifié login/signup) ──
const checkEmailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("check-email"),
  message: { error: "Trop de vérifications. Patiente un peu." },
});
authRouter.post("/check-email", checkEmailLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const existing = await prisma.seller.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      select: { id: true, googleId: true, password: true },
    });
    
    if (existing) {
      // If user has googleId and no password, they are a Google-only user
      const authType = (existing.googleId && !existing.password) ? "google" : "email";
      res.json({ exists: true, authType });
    } else {
      res.json({ exists: false });
    }
  } catch {
    res.json({ exists: false });
  }
});

// ── POST /api/auth/signup ──
authRouter.post("/signup", signupLimiter, async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);

    // S13: Vérifier que le slug n'est pas un mot réservé
    if (RESERVED_SLUGS.has(data.slug)) {
      res.status(409).json({ error: "Ce nom de page est réservé" });
      return;
    }

    const existingEmail = await prisma.seller.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      res.status(409).json({ error: "Cet email est déjà utilisé" });
      return;
    }

    const existingSlug = await prisma.seller.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      res.status(409).json({ error: "Ce nom de page est déjà pris" });
      return;
    }

    const hashedPassword = await hashPassword(data.password);

    // If this slug was someone's old slug, remove the redirect — new owner takes priority
    await prisma.slugHistory.deleteMany({ where: { oldSlug: data.slug } });

    const seller = await prisma.seller.create({
      data: {
        email: data.email,
        password: hashedPassword,
        displayName: data.displayName,
        slug: data.slug,
      },
    });

    // Générer code de vérification 6 chiffres (crypto-secure)
    const code = generateVerificationCode();

    await prisma.verificationCode.create({
      data: {
        email: data.email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    });

    // M8: Send verification email via queue (non-bloquant, retry automatique)
    queueAuthEmail({
      to: data.email,
      subject: "Vérifie ton email — Izy Store",
      html: `<h2>Vérifie ton email</h2>
        <p>Bienvenue sur Izy ! Entre ce code pour activer ton compte :</p>
        <div style="margin:20px 0;padding:20px;background-color:#F0FDFA;border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#0D9488;">${code}</span>
        </div>
        <p style="font-size:13px;color:#9CA3AF;">Ce code expire dans 10 minutes.</p>`,
    });
    const emailSent = true;

    res.status(201).json({
      seller: {
        id: seller.id,
        email: seller.email,
        slug: seller.slug,
        displayName: seller.displayName,
        emailVerified: seller.emailVerified,
      },
      message: emailSent
        ? "Compte créé. Vérifie ton email."
        : "Compte créé. L'email n'a pas pu être envoyé — clique sur 'Renvoyer le code'.",
      emailSent,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur inscription", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/resend-code ──
const resendCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // max 3 resends per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("resend-code"),
  message: { error: "Trop de demandes. Réessaye dans quelques minutes." },
});
authRouter.post("/resend-code", resendCodeLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // NEW-V2: Exclude soft-deleted accounts from resend-code
    const seller = await prisma.seller.findFirst({ where: { email, deletedAt: null } });
    if (!seller) {
      // Ne pas révéler si l'email existe ou non
      res.json({ message: "Si ce compte existe, un nouveau code a été envoyé." });
      return;
    }

    if (seller.emailVerified) {
      res.status(400).json({ error: "Email déjà vérifié" });
      return;
    }

    // Vérifier rate limit : pas plus d'un code par minute
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentCode) {
      res.status(429).json({ error: "Attends 1 minute avant de renvoyer un code." });
      return;
    }

    const code = generateVerificationCode();

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Queue auth email (non-bloquant, retry automatique)
    queueAuthEmail({
      to: email,
      subject: "Nouveau code — Izy Store",
      html: `<h2>Nouveau code</h2>
        <p>Voici ton nouveau code de vérification :</p>
        <div style="margin:20px 0;padding:20px;background-color:#F0FDFA;border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#0D9488;">${code}</span>
        </div>
        <p style="font-size:13px;color:#9CA3AF;">Ce code expire dans 10 minutes.</p>`,
    });

    res.json({ message: "Si ce compte existe, un nouveau code a été envoyé." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur resend code", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/verify-email ──
authRouter.post("/verify-email", verifyEmailLimiter, async (req, res) => {
  try {
    const data = verifyEmailSchema.parse(req.body);

    // Trouver le dernier code non utilisé pour cet email
    const latestCode = await prisma.verificationCode.findFirst({
      where: {
        email: data.email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!latestCode) {
      res.status(400).json({ error: "Code invalide ou expiré" });
      return;
    }

    if (latestCode.attempts >= 5) {
      res.status(429).json({ error: "Trop de tentatives. Demande un nouveau code." });
      return;
    }

    // S7: Timing-safe code comparison
    if (!timingSafeCompare(latestCode.code, data.code)) {
      await prisma.verificationCode.update({
        where: { id: latestCode.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ error: "Code invalide" });
      return;
    }

    // Marquer le code comme utilisé
    await prisma.verificationCode.update({
      where: { id: latestCode.id },
      data: { usedAt: new Date() },
    });

    // Vérifier l'email du seller
    const seller = await prisma.seller.update({
      where: { email: data.email },
      data: { emailVerified: true },
    });

    // Créer le token JWT
    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(seller.id);

    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setCsrfCookie(res); // S6: CSRF double-submit cookie

    // S5: token removed from body — cookie httpOnly suffit
    // S6b: csrfToken in body for cross-domain
    res.json({
      seller: {
        id: seller.id,
        email: seller.email,
        slug: seller.slug,
        displayName: seller.displayName,
        onboardingCompleted: seller.onboardingCompleted,
        plan: seller.plan,
      },
      csrfToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur verify-email", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/logout ──
authRouter.post("/logout", (req, res) => {
  clearAuthCookies(res);
  clearCsrfCookie(res); // S6
  res.json({ message: "Déconnexion réussie" });
});

// ── POST /api/auth/refresh — Refresh access token using refresh token ──
authRouter.post("/refresh", async (req, res) => {
  try {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshTokenValue) {
      res.status(401).json({ error: "Refresh token manquant" });
      return;
    }

    // BUG-6 FIX: Use verifyRefreshToken() instead of verifyToken()
    // verifyToken() blocks refresh tokens (returns null) — that's correct for access token validation
    // but the refresh endpoint needs to specifically accept refresh tokens
    const refreshPayload = await verifyRefreshToken(refreshTokenValue);
    if (!refreshPayload) {
      res.status(401).json({ error: "Refresh token invalide" });
      return;
    }

    // Verify seller still exists and not soft-deleted
    const seller = await prisma.seller.findFirst({
      where: { id: refreshPayload.sub, deletedAt: null },
      select: { id: true, slug: true, plan: true, onboardingCompleted: true },
    });
    if (!seller) {
      clearAuthCookies(res);
      clearCsrfCookie(res);
      res.status(401).json({ error: "Compte introuvable" });
      return;
    }

    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
      onboardingCompleted: seller.onboardingCompleted,
    };
    const newAccessToken = await createAccessToken(tokenPayload);
    const newRefreshToken = await createRefreshToken(seller.id);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    // S6: Always set CSRF cookie + return in body for cross-domain
    const csrfToken = setCsrfCookie(res);
    res.json({ ok: true, csrfToken });
  } catch (err) {
    logger.error("Erreur refresh token", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/auth/me ──
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // NEW-S3: Filter deletedAt to prevent returning data for soft-deleted accounts
    const seller = await prisma.seller.findFirst({
      where: { id: sellerId, deletedAt: null },
      select: {
        id: true,
        email: true,
        slug: true,
        displayName: true,
        subtitle: true,
        avatarUrl: true,
        coverUrl: true,
        showAvatar: true,
        onboardingCompleted: true,
        plan: true,
        bio: true,
        themeId: true,
        themeFont: true,
        themeColors: true,
        bgImageUrl: true,
        headerLayout: true,
        imageStyle: true,
        instagramUrl: true,
        tiktokUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        twitterUrl: true,
        telegramUrl: true,
        snapchatUrl: true,
        websiteUrl: true,
        notificationPrefs: true,
        payoutPhone: true,
        payoutProvider: true,
        payoutName: true,
        payoutCountry: true,
        kycStatus: true,
        // Phase 6 plan 06-02 (D-29): widen for /profil/kyc + /profil phone input
        phone: true,
        phoneCountry: true,
        kycFullName: true,
        kycIdUrl: true,
        kycSelfieUrl: true,
      },
    });

    if (!seller) {
      res.status(404).json({ error: "Vendeur introuvable" });
      return;
    }

    res.json({ seller });
  } catch (err) {
    logger.error("Erreur auth/me", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/login ──
authRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const seller = await prisma.seller.findFirst({
      where: { email: data.email, deletedAt: null },
    });

    if (!seller) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    // S5: Google-only users have null password — generic error to prevent info leakage
    if (!seller.password) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const valid = await verifyPassword(data.password, seller.password);
    if (!valid) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    if (!seller.emailVerified) {
      res.status(403).json({ error: "Email non vérifié" });
      return;
    }

    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
      onboardingCompleted: seller.onboardingCompleted,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(seller.id);

    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setCsrfCookie(res); // S6: CSRF double-submit cookie

    // S5: token removed from body — cookie httpOnly suffit
    // S6b: csrfToken in body for cross-domain
    res.json({
      seller: {
        id: seller.id,
        email: seller.email,
        slug: seller.slug,
        displayName: seller.displayName,
        plan: seller.plan,
        onboardingCompleted: seller.onboardingCompleted,
      },
      csrfToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur login", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/forgot-password ──
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("forgot-password"),
  message: { error: "Trop de demandes. Réessaye dans 15 minutes." },
});
authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // NEW-L3: Exclude soft-deleted accounts from password reset
    const seller = await prisma.seller.findFirst({ where: { email, deletedAt: null } });
    // Ne pas révéler si l'email existe
    if (!seller) {
      res.json({ message: "Si ce compte existe, un code de réinitialisation a été envoyé." });
      return;
    }

    // Rate limit : 1 code par minute
    const recentCode = await prisma.verificationCode.findFirst({
      where: { email, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentCode) {
      res.status(429).json({ error: "Attends 1 minute avant de renvoyer un code." });
      return;
    }

    const code = generateVerificationCode();

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Queue auth email (non-bloquant, retry automatique)
    queueAuthEmail({
      to: email,
      subject: "Réinitialisation du mot de passe — Izy Store",
      html: `<h2>Mot de passe oublié</h2>
        <p>Entre ce code pour réinitialiser ton mot de passe :</p>
        <div style="margin:20px 0;padding:20px;background-color:#F0FDFA;border-radius:12px;text-align:center;">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#0D9488;">${code}</span>
        </div>
        <p style="font-size:13px;color:#9CA3AF;">Ce code expire dans 10 minutes.</p>
        <p style="font-size:13px;color:#9CA3AF;">Si tu n'as pas demandé cette réinitialisation, ignore cet email.</p>`,
    });

    res.json({ message: "Si ce compte existe, un code de réinitialisation a été envoyé." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur forgot-password", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/auth/reset-password ──
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("reset-password"),
  message: { error: "Trop de tentatives de réinitialisation. Réessaye plus tard." },
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code à 6 chiffres"),
  newPassword: z.string().min(8, "Minimum 8 caractères").max(128, "Maximum 128 caractères"),
});

authRouter.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const latestCode = await prisma.verificationCode.findFirst({
      where: { email: data.email, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!latestCode) {
      res.status(400).json({ error: "Code invalide ou expiré" });
      return;
    }

    if (latestCode.attempts >= 5) {
      res.status(429).json({ error: "Trop de tentatives. Demande un nouveau code." });
      return;
    }

    // S7: Timing-safe code comparison
    if (!timingSafeCompare(latestCode.code, data.code)) {
      await prisma.verificationCode.update({
        where: { id: latestCode.id },
        data: { attempts: { increment: 1 } },
      });
      res.status(400).json({ error: "Code invalide" });
      return;
    }

    await prisma.verificationCode.update({
      where: { id: latestCode.id },
      data: { usedAt: new Date() },
    });

    const hashed = await hashPassword(data.newPassword);
    await prisma.seller.update({
      where: { email: data.email },
      data: { password: hashed },
    });

    res.json({ message: "Mot de passe mis à jour. Tu peux te connecter." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur reset-password", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── PUT /api/auth/change-password ──
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Minimum 8 caractères").max(128, "Maximum 128 caractères"),
});

// M10: CSRF protection sur les mutations auth
authRouter.put("/change-password", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;
    const data = changePasswordSchema.parse(req.body);

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, password: true },
    });

    if (!seller) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }

    // S1: Vérifier l'ancien mot de passe avant d'autoriser le changement
    if (!seller.password || !(await verifyPassword(data.currentPassword, seller.password))) {
      res.status(403).json({ error: "Mot de passe actuel incorrect" });
      return;
    }

    const hashed = await hashPassword(data.newPassword);
    await prisma.seller.update({
      where: { id: sellerId },
      data: { password: hashed },
    });

    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur change-password", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── DELETE /api/auth/account ──
authRouter.delete("/account", verifyCsrf, requireAuth, async (req, res) => {
  try {
    const sellerId = req.seller!.sub;

    // C6: NE PAS supprimer le webhook Telegram — le bot central est partagé par tous les vendeurs.
    // Supprimer le webhook ici casserait /connect et /start pour TOUS les vendeurs.

    // D1: Soft delete — conservation légale des données financières (7 ans)
    // Marquer le seller et ses orders comme supprimés au lieu de les détruire
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.order.updateMany({
        where: { sellerId },
        data: { deletedAt: now },
      });
      await tx.seller.update({
        where: { id: sellerId },
        data: { deletedAt: now },
      });
      // Nettoyage des données non-financières
      await tx.verificationCode.deleteMany({
        where: { email: (await tx.seller.findUnique({ where: { id: sellerId }, select: { email: true } }))!.email },
      });
    });

    clearAuthCookies(res);
    clearCsrfCookie(res); // S6
    res.json({ message: "Compte supprimé" });
  } catch (err) {
    logger.error("Erreur delete account", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /unsubscribe — Désabonnement email (public, no auth) ──
const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("unsubscribe"),
  message: { error: "Trop de demandes." },
});
authRouter.post("/unsubscribe", unsubscribeLimiter, async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    // Flag seller as unsubscribed — don't reveal if email exists
    await prisma.seller.updateMany({
      where: { email: email.toLowerCase(), deletedAt: null },
      data: { emailUnsubscribed: true },
    });

    res.json({ message: "Désabonnement confirmé" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Email invalide" });
      return;
    }
    logger.error("Erreur unsubscribe", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
