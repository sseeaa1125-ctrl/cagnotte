import type { Request, Response, NextFunction } from "express";
import {
  verifyAdminToken,
  ADMIN_COOKIE_NAME,
  type AdminTokenPayload,
} from "../lib/adminAuth.js";
import { prisma } from "../lib/prisma.js";

// Extend Express Request with admin property
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        role: string;
        name: string;
      };
    }
  }
}

// 30s in-memory cache — same pattern as seller auth cache
const AUTH_CACHE_TTL = 30_000;
const adminCache = new Map<
  string,
  { email: string; role: string; name: string; isActive: boolean; expiresAt: number }
>();

// Periodic cleanup every 5min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of adminCache) {
    if (v.expiresAt <= now) adminCache.delete(k);
  }
}, 5 * 60 * 1000);

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Read token from cookie only — no Bearer header fallback (cookie-only auth)
  const token = req.cookies?.[ADMIN_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: "Token admin manquant" });
    return;
  }

  const payload: AdminTokenPayload | null = await verifyAdminToken(token);

  if (!payload) {
    res.status(401).json({ error: "Token admin invalide ou expiré" });
    return;
  }

  // Check in-memory cache first
  const cached = adminCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.isActive) {
      res.status(403).json({ error: "Compte admin désactivé" });
      return;
    }
    req.admin = {
      id: payload.sub,
      email: cached.email,
      role: cached.role,
      name: cached.name,
    };
    next();
    return;
  }

  // Re-query admin from DB to prevent stale JWT bypass
  const freshAdmin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, name: true, isActive: true },
  });

  if (!freshAdmin) {
    adminCache.delete(payload.sub);
    res.status(401).json({ error: "Compte admin introuvable" });
    return;
  }

  if (!freshAdmin.isActive) {
    adminCache.delete(payload.sub);
    res.status(403).json({ error: "Compte admin désactivé" });
    return;
  }

  // Cache for 30s
  adminCache.set(payload.sub, {
    email: freshAdmin.email,
    role: freshAdmin.role,
    name: freshAdmin.name,
    isActive: freshAdmin.isActive,
    expiresAt: Date.now() + AUTH_CACHE_TTL,
  });

  req.admin = {
    id: freshAdmin.id,
    email: freshAdmin.email,
    role: freshAdmin.role,
    name: freshAdmin.name,
  };
  next();
}

/** Evict a specific admin from the in-memory auth cache (e.g. on logout or deactivation). */
export function evictAdminCache(id: string): void {
  adminCache.delete(id);
}

/**
 * Role-based access control middleware.
 * Must be used after requireAdmin — chains requireAdmin + role check.
 */
export function requireRole(...roles: string[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // First ensure admin is authenticated
    await requireAdmin(req, res, () => {
      // If requireAdmin sent a response, req.admin won't be set
      if (!req.admin) return;

      if (!roles.includes(req.admin.role)) {
        res.status(403).json({ error: "Permissions insuffisantes" });
        return;
      }

      next();
    });
  };
}
