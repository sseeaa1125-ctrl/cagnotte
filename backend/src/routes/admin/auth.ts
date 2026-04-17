import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import {
  verifyPassword,
  hashPassword,
  createAdminAccessToken,
  createAdminRefreshToken,
  setAdminAuthCookies,
  clearAdminAuthCookies,
  setAdminCsrfCookie,
  clearAdminCsrfCookie,
  verifyAdminRefreshToken,
  verifyAdminToken,
  ADMIN_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_NAME,
} from "../../lib/adminAuth.js";
import { requireAdmin, evictAdminCache } from "../../middleware/requireAdmin.js";
import { logAdminAction } from "../../lib/adminLog.js";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../../lib/rateLimitStore.js";
import * as logger from "../../lib/logger.js";

export const adminAuthRouter = Router();

// ── Zod schemas ──
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("Email invalide"));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

// ── Rate limiters ──
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("admin-login"),
  message: { error: "Trop de tentatives de connexion admin. Réessaye dans 15 minutes." },
});

// ── POST /login ──
adminAuthRouter.post("/login", adminLoginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (!admin) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }

    if (!admin.isActive) {
      res.status(403).json({ error: "Compte admin désactivé" });
      return;
    }

    const validPassword = await verifyPassword(data.password, admin.password);
    if (!validPassword) {
      res.status(401).json({ error: "Identifiants invalides" });
      return;
    }

    const accessToken = await createAdminAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      aud: "admin",
    });
    const refreshToken = await createAdminRefreshToken(admin.id);

    setAdminAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setAdminCsrfCookie(res);

    await logAdminAction(admin.id, "LOGIN", `admin:${admin.id}`, {}, req.ip);

    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      csrfToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Données invalides" });
      return;
    }
    logger.error("Admin login error", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /refresh ──
adminAuthRouter.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.[ADMIN_REFRESH_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "Session expirée" });
      return;
    }

    const payload = await verifyAdminRefreshToken(token);
    if (!payload) {
      res.status(401).json({ error: "Session expirée" });
      return;
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: "Session expirée" });
      return;
    }

    const accessToken = await createAdminAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      aud: "admin",
    });
    const refreshToken = await createAdminRefreshToken(admin.id);

    setAdminAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setAdminCsrfCookie(res);

    res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      csrfToken,
    });
  } catch (err) {
    logger.error("Admin refresh error", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── POST /logout ──
adminAuthRouter.post("/logout", async (req, res) => {
  // Evict admin from auth cache before clearing cookies
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (token) {
    const payload = await verifyAdminToken(token);
    if (payload) {
      evictAdminCache(payload.sub);
    }
  }
  clearAdminAuthCookies(res);
  clearAdminCsrfCookie(res);
  res.json({ ok: true });
});

// ── GET /me ──
adminAuthRouter.get("/me", requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// ── PUT /change-password ──
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Le nouveau mot de passe doit avoir au moins 8 caracteres"),
});

adminAuthRouter.put("/change-password", requireAdmin, async (req, res) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const adminId = req.admin!.id;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, password: true },
    });

    if (!admin) {
      res.status(404).json({ error: "Compte introuvable" });
      return;
    }

    const validCurrent = await verifyPassword(data.currentPassword, admin.password);
    if (!validCurrent) {
      res.status(403).json({ error: "Mot de passe actuel incorrect" });
      return;
    }

    const hashed = await hashPassword(data.newPassword);
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashed },
    });

    await logAdminAction(adminId, "PASSWORD_CHANGED", `admin:${adminId}`, {}, req.ip);

    res.json({ ok: true, message: "Mot de passe mis a jour" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message ?? "Donnees invalides" });
      return;
    }
    logger.error("Admin change-password error", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
