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
// Audit 012 F-01 — normalize email to lowercase + trim at the schema level
// so downstream code never has to worry about `Alice@Example.com` vs
// `alice@example.com` inconsistency.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("Email invalide"));

const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Minimum 8 caractères").max(128, "Maximum 128 caractères"),
  displayName: z.string().min(2, "Minimum 2 caractères").max(50),
  slug: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(30)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Lettres minuscules, chiffres et tirets uniquement"),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

const verifyEmailSchema = z.object({
  email: emailSchema,
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

// Audit 012: rate limiter on POST /refresh. Without this, a stolen refresh
// token could be replayed thousands of times per minute, and the endpoint
// is also a brute-force surface. Budget: 30 refreshes per 15min per IP —
// matches a legit multi-tab SPA (tab focus triggers a refresh) without
// room for abuse.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("refresh"),
  message: { error: "Trop de rafraîchissements. Reconnecte-toi." },
});

// Audit 013 L-03 — separate limiter for GET /refresh-and-return. This
// endpoint fires on *navigation* (middleware-triggered, one hit per tab
// per expired cookie) which has a different traffic pattern than the
// API-triggered POST /refresh. Sharing a single 30/15min bucket was
// bleeding the quota across both and locking out users who opened a few
// tabs after 15 min idle. Budget 60/15min on its own Redis key.
const refreshNavLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("refresh-nav"),
  message: { error: "Trop de rafraîchissements. Reconnecte-toi." },
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
    const { email } = z.object({ email: emailSchema }).parse(req.body);
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
      subject: "Vérifie ton email — Cagnottes.sn",
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
    const { email } = z.object({ email: emailSchema }).parse(req.body);

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
      subject: "Nouveau code — Cagnottes.sn",
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
      tokenVersion: seller.tokenVersion,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(seller.id, seller.tokenVersion);

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
authRouter.post("/refresh", refreshLimiter, async (req, res) => {
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
      select: { id: true, slug: true, plan: true, onboardingCompleted: true, tokenVersion: true },
    });
    if (!seller) {
      clearAuthCookies(res);
      clearCsrfCookie(res);
      res.status(401).json({ error: "Compte introuvable" });
      return;
    }

    // Audit 012 S-03 — reject refresh tokens minted before a password change.
    if (seller.tokenVersion !== refreshPayload.tokenVersion) {
      clearAuthCookies(res);
      clearCsrfCookie(res);
      res.status(401).json({ error: "Session expirée" });
      return;
    }

    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
      onboardingCompleted: seller.onboardingCompleted,
      tokenVersion: seller.tokenVersion,
    };
    const newAccessToken = await createAccessToken(tokenPayload);
    const newRefreshToken = await createRefreshToken(seller.id, seller.tokenVersion);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    // S6: Always set CSRF cookie + return in body for cross-domain
    const csrfToken = setCsrfCookie(res);
    res.json({ ok: true, csrfToken });
  } catch (err) {
    logger.error("Erreur refresh token", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/auth/refresh-and-return — Silent refresh + redirect ──
// Why this exists: the (authed) Next.js layout is a server component and
// cannot trigger a /refresh fetch + cookie write mid-render. The refresh
// cookie is path-scoped to /api/auth, so middleware on a /tableau-de-bord
// request never sees it. Solution: middleware redirects to this endpoint
// (the URL matches /api/auth, so the browser sends izy-refresh), we mint
// new tokens, set cookies via setAuthCookies, then 302 back to `next`.
// On any failure → 302 to /connexion?next=<sanitized>.
function sanitizeNext(rawNext: unknown): string {
  if (typeof rawNext !== "string") return "/tableau-de-bord";
  if (!rawNext.startsWith("/")) return "/tableau-de-bord";
  // Block protocol-relative URLs and backslash tricks
  if (rawNext.startsWith("//") || rawNext.startsWith("/\\")) {
    return "/tableau-de-bord";
  }
  return rawNext;
}

authRouter.get("/refresh-and-return", refreshNavLimiter, async (req, res) => {
  const next = sanitizeNext(req.query.next);
  const loginRedirect = `/connexion?next=${encodeURIComponent(next)}`;

  try {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshTokenValue) {
      res.redirect(302, loginRedirect);
      return;
    }

    const refreshPayload = await verifyRefreshToken(refreshTokenValue);
    if (!refreshPayload) {
      clearAuthCookies(res);
      clearCsrfCookie(res);
      res.redirect(302, loginRedirect);
      return;
    }

    const seller = await prisma.seller.findFirst({
      where: { id: refreshPayload.sub, deletedAt: null },
      select: { id: true, slug: true, plan: true, onboardingCompleted: true, tokenVersion: true },
    });
    if (!seller || seller.tokenVersion !== refreshPayload.tokenVersion) {
      clearAuthCookies(res);
      clearCsrfCookie(res);
      res.redirect(302, loginRedirect);
      return;
    }

    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
      onboardingCompleted: seller.onboardingCompleted,
      tokenVersion: seller.tokenVersion,
    };
    const newAccessToken = await createAccessToken(tokenPayload);
    const newRefreshToken = await createRefreshToken(seller.id, seller.tokenVersion);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    setCsrfCookie(res);
    res.redirect(302, next);
  } catch (err) {
    logger.error("Erreur refresh-and-return", err);
    res.redirect(302, loginRedirect);
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

    // Re-issue CSRF token on every authed /me call so cross-origin dev
    // (frontend :3000 / backend :4000) and localStorage-cleared sessions
    // re-hydrate via AuthContext instead of silently failing mutations with
    // "Token CSRF invalide".
    const csrfToken = setCsrfCookie(res);
    res.json({ seller, csrfToken });
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
      tokenVersion: seller.tokenVersion,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(seller.id, seller.tokenVersion);

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
    const { email } = z.object({ email: emailSchema }).parse(req.body);

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
      subject: "Réinitialisation du mot de passe — Cagnottes.sn",
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
  email: emailSchema,
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
    // Audit 030 HI-04 — bump tokenVersion to invalidate stolen sessions
    await prisma.seller.update({
      where: { email: data.email },
      data: { password: hashed, tokenVersion: { increment: 1 } },
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
    // Audit 012 S-03 — bump tokenVersion in the same write. Every JWT minted
    // before this point is now stale: requireAuth rejects them and the next
    // refresh attempt hits the version check in /refresh above. We re-issue
    // fresh cookies inline so the caller keeps their session seamlessly
    // instead of being kicked to /connexion on the next request.
    const updated = await prisma.seller.update({
      where: { id: sellerId },
      data: {
        password: hashed,
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        onboardingCompleted: true,
        tokenVersion: true,
      },
    });

    const tokenPayload = {
      sub: updated.id,
      slug: updated.slug,
      plan: updated.plan,
      onboardingCompleted: updated.onboardingCompleted,
      tokenVersion: updated.tokenVersion,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(updated.id, updated.tokenVersion);
    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setCsrfCookie(res);

    res.json({ message: "Mot de passe mis à jour", csrfToken });
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
    const { email } = z.object({ email: emailSchema }).parse(req.body);

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

// ─────────────────────────────────────────────────────────────────────────
// Phase 8 fixpack — Google OAuth (hand-rolled, zero new npm deps).
//
// Flow:
//   1. GET /api/auth/google/authorize → generates CSRF state, stores in
//      izy-google-state cookie (10 min), 302 redirects to Google consent.
//   2. GET /api/auth/google/callback → verifies state, exchanges code for
//      id_token (native fetch), decodes JWT middle segment (no signature
//      verification — we trust Google's HTTPS), upserts Seller by email,
//      issues izy-token + csrf, 302 redirects to FRONTEND_URL/tableau-de-bord.
//
// Security notes accepted as v1 trade-offs:
//   - id_token signature is not verified (trust Google's HTTPS endpoint).
//     v2 should fetch Google's JWKS and verify via jose.
//   - No signature verification means a compromised TLS path could forge
//     a token. Defense-in-depth: the token exchange hits Google directly.
// ─────────────────────────────────────────────────────────────────────────

const GOOGLE_STATE_COOKIE = "izy-google-state";
const GOOGLE_STATE_MAX_AGE = 10 * 60 * 1000; // 10 min

function slugifyDisplayName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function generateAvailableSlug(base: string): Promise<string> {
  let candidate = base || "createur";
  if (RESERVED_SLUGS.has(candidate)) candidate = `createur-${candidate}`.slice(0, 30);
  if (candidate.length < 3) candidate = `createur-${candidate}`.slice(0, 30);
  // Try base, base-2, base-3, ...
  for (let i = 0; i < 20; i++) {
    const attempt = i === 0 ? candidate : `${candidate}-${i + 1}`.slice(0, 30);
    const existing = await prisma.seller.findUnique({
      where: { slug: attempt },
      select: { id: true },
    });
    if (!existing) return attempt;
  }
  // Fallback: random suffix.
  return `${candidate}-${Date.now().toString(36).slice(-4)}`.slice(0, 30);
}

function decodeIdTokenPayload(idToken: string): {
  email?: string;
  email_verified?: boolean;
  sub?: string;
  name?: string;
  picture?: string;
} | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url → base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ── GET /api/auth/google/authorize ──
authRouter.get("/google/authorize", (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      logger.error("GOOGLE_CLIENT_ID not configured");
      res.status(500).json({ error: "OAuth non configuré" });
      return;
    }

    const backendBaseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${backendBaseUrl}/api/auth/google/callback`;

    const state = crypto.randomBytes(32).toString("hex");
    const isProd = process.env.NODE_ENV === "production";
    res.cookie(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax", // Must be "lax" for OAuth redirect to send the cookie
      maxAge: GOOGLE_STATE_MAX_AGE,
      path: "/api/auth",
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.redirect(302, authUrl);
  } catch (err) {
    logger.error("Erreur google/authorize", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── GET /api/auth/google/callback ──
authRouter.get("/google/callback", async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const cookieState = req.cookies?.[GOOGLE_STATE_COOKIE];

    // Clear state cookie immediately (single-use)
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie(GOOGLE_STATE_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api/auth",
    });

    // Audit 030 CR-02 — timing-safe state comparison (prevents iterative brute-force)
    if (!code || !state || !cookieState) {
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }
    const stateBuf = Buffer.from(state);
    const cookieBuf = Buffer.from(cookieState);
    if (stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(stateBuf, cookieBuf)) {
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      logger.error("GOOGLE_CLIENT_ID/SECRET not configured");
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }

    const backendBaseUrl =
      process.env.BACKEND_URL ||
      `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${backendBaseUrl}/api/auth/google/callback`;

    // Exchange code for tokens (native fetch, no new deps)
    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
    if (!tokenRes.ok) {
      logger.error("Google token exchange failed", {
        status: tokenRes.status,
      });
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) {
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }

    // Decode id_token (trust Google HTTPS — see security note above)
    const profile = decodeIdTokenPayload(tokenJson.id_token);
    if (!profile?.email || !profile.sub) {
      res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
      return;
    }

    const email = profile.email.toLowerCase();
    const googleId = profile.sub;
    const name = profile.name?.trim() || email.split("@")[0];

    // Lookup existing seller by email
    let seller = await prisma.seller.findFirst({
      where: { email, deletedAt: null },
    });

    if (seller) {
      // Existing account — link googleId if missing
      if (seller.googleId && seller.googleId !== googleId) {
        // Account is linked to a different Google ID — conflict
        res.redirect(302, `${frontendUrl}/connexion?error=email_in_use`);
        return;
      }
      if (!seller.googleId) {
        seller = await prisma.seller.update({
          where: { id: seller.id },
          data: {
            googleId,
            emailVerified: true, // Google has verified it
          },
        });
      }
    } else {
      // New account — create via Google
      const baseSlug = slugifyDisplayName(name);
      const slug = await generateAvailableSlug(baseSlug);
      seller = await prisma.seller.create({
        data: {
          email,
          password: null,
          googleId,
          displayName: name,
          slug,
          emailVerified: true,
        },
      });
    }

    // Issue session
    const tokenPayload = {
      sub: seller.id,
      slug: seller.slug,
      plan: seller.plan,
      tokenVersion: seller.tokenVersion,
    };
    const accessToken = await createAccessToken(tokenPayload);
    const refreshToken = await createRefreshToken(seller.id, seller.tokenVersion);
    setAuthCookies(res, accessToken, refreshToken);
    setCsrfCookie(res);

    res.redirect(302, `${frontendUrl}/tableau-de-bord`);
  } catch (err) {
    logger.error("Erreur google/callback", err);
    res.redirect(302, `${frontendUrl}/connexion?error=google_failed`);
  }
});
