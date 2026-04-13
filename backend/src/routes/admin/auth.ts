import { Router } from "express";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword, verifyToken, JWT_SECRET_BYTES, setCsrfCookie, clearCsrfCookie, clearAuthCookies, verifyCsrf } from "../../lib/auth.js";
import { requireAdmin, requireRole, ADMIN_COOKIE_NAME } from "../../middleware/adminAuth.js";
import { getClientIp } from "../../lib/getClientIp.js";
import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../../lib/rateLimitStore.js";
import * as logger from "../../lib/logger.js";
import { formatZodError } from "../../lib/zodErrors.js";

export const adminAuthRouter = Router();

const ADMIN_TOKEN_EXPIRY = "4h";
const ADMIN_COOKIE_MAX_AGE = 4 * 60 * 60 * 1000; // 4 hours

// ── Rate limiters ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: "Trop de tentatives. Réessaye dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore("admin-login"),
});

// ── Helper: create admin JWT ──
async function createAdminToken(admin: { id: string; email: string; role: string }): Promise<string> {
  return new SignJWT({ sub: admin.id, email: admin.email, role: admin.role, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ADMIN_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES);
}

// ── Helper: set admin cookie ──
function setAdminCookie(res: import("express").Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
}

function clearAdminCookie(res: import("express").Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

// ── Schemas ──
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, "Le mot de passe admin doit contenir au moins 12 caractères"),
  name: z.string().min(1).max(100),
  role: z.enum(["ADMIN", "SUPPORT"]),
});

// ── POST /api/admin/auth/login ──
adminAuthRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
      select: { id: true, email: true, password: true, name: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const validPassword = await verifyPassword(data.password, admin.password);
    if (!validPassword) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }

    const token = await createAdminToken(admin);
    setAdminCookie(res, token);
    const csrfToken = setCsrfCookie(res);

    // Audit log
    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "LOGIN",
        target: `admin:${admin.id}`,
        ip: getClientIp(req),
      },
    });

    logger.log(`[Admin] Login: ${admin.email} (${admin.role})`);

    res.json({
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      csrfToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur login admin", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/admin/auth/logout ──
// Pas de verifyCsrf ici : le logout doit toujours fonctionner même si le cookie CSRF est manquant/expiré
adminAuthRouter.post("/logout", requireAdmin, async (req, res) => {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: "LOGOUT",
        target: `admin:${req.admin!.sub}`,
        ip: getClientIp(req),
      },
    });

    // Déconnexion globale : supprimer admin + seller + CSRF cookies
    clearAdminCookie(res);
    clearAuthCookies(res);
    clearCsrfCookie(res);
    res.json({ ok: true });
  } catch (err) {
    logger.error("Erreur logout admin", err);
    clearAdminCookie(res);
    clearAuthCookies(res);
    clearCsrfCookie(res);
    res.json({ ok: true });
  }
});

// ── GET /api/admin/auth/me ──
// Auth unifiée : si pas de token admin, on vérifie le token seller (izy-token).
// Si le seller a un email qui matche un admin actif, on l'auto-connecte en admin.
adminAuthRouter.get("/me", async (req, res) => {
  try {
    // 1. Essayer le token admin d'abord
    let adminToken = req.cookies?.[ADMIN_COOKIE_NAME];
    if (!adminToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        adminToken = authHeader.split(" ")[1];
      }
    }

    if (adminToken) {
      // Vérifier le token admin normalement
      try {
        const { payload } = await jwtVerify(adminToken, JWT_SECRET_BYTES);
        const tokenType = (payload as Record<string, unknown>).type;
        if (tokenType === "admin" && payload.sub) {
          const admin = await prisma.admin.findUnique({
            where: { id: payload.sub as string },
            select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
          });
          if (admin && admin.isActive) {
            const { isActive: _, ...adminData } = admin;
            // Return existing CSRF token so frontend can sync localStorage
            const existingCsrf = req.cookies?.["izy-csrf"] || null;
            res.json({ admin: adminData, csrfToken: existingCsrf });
            return;
          }
        }
      } catch {
        // Token admin invalide — on continue vers le fallback seller
      }
    }

    // 2. Fallback : vérifier le token seller (izy-token)
    const sellerToken = req.cookies?.["izy-token"];
    if (!sellerToken) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const sellerPayload = await verifyToken(sellerToken);
    if (!sellerPayload) {
      res.status(401).json({ error: "Token invalide" });
      return;
    }

    // Récupérer l'email du seller
    const seller = await prisma.seller.findUnique({
      where: { id: sellerPayload.sub },
      select: { email: true },
    });
    if (!seller) {
      res.status(401).json({ error: "Compte introuvable" });
      return;
    }

    // Chercher un admin avec le même email
    const admin = await prisma.admin.findUnique({
      where: { email: seller.email },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: "Accès admin non autorisé" });
      return;
    }

    // Auto-login admin : créer le token admin, réutiliser le CSRF cookie existant
    const token = await createAdminToken(admin);
    setAdminCookie(res, token);
    // Réutiliser le CSRF cookie du seller login (ne pas en créer un nouveau via Set-Cookie)
    const existingCsrf = req.cookies?.["izy-csrf"];
    const csrfToken = existingCsrf || setCsrfCookie(res);

    // Audit log
    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "AUTO_LOGIN_FROM_SELLER",
        target: `admin:${admin.id}`,
        ip: getClientIp(req),
      },
    });

    logger.log(`[Admin] Auto-login via seller session: ${admin.email} (${admin.role})`);

    const { isActive: _, ...adminData } = admin;
    res.json({ admin: adminData, csrfToken });
  } catch (err) {
    logger.error("Erreur admin me", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// ── POST /api/admin/auth/create — SUPER_ADMIN only ──
adminAuthRouter.post("/create", verifyCsrf, requireAdmin, requireRole("SUPER_ADMIN"), async (req, res) => {
  try {
    const data = createAdminSchema.parse(req.body);

    // Vérifier unicité email
    const existing = await prisma.admin.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: "Un admin avec cet email existe déjà" });
      return;
    }

    const hashedPassword = await hashPassword(data.password);

    const newAdmin = await prisma.admin.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    // Audit log
    await prisma.adminLog.create({
      data: {
        adminId: req.admin!.sub,
        action: "ADMIN_CREATED",
        target: `admin:${newAdmin.id}`,
        details: { email: newAdmin.email, role: newAdmin.role },
        ip: getClientIp(req),
      },
    });

    logger.log(`[Admin] Créé par ${req.admin!.email}: ${newAdmin.email} (${newAdmin.role})`);

    res.status(201).json({ admin: newAdmin });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur création admin", err);
    res.status(500).json({ error: "Erreur interne" });
  }
});
