import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { JWT_SECRET_BYTES } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import type { AdminRole } from "../generated/prisma/client.js";

const ADMIN_COOKIE_NAME = "izy-admin-token";

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/**
 * Verify an admin JWT token.
 * Returns payload or null if invalid/expired/not-admin.
 */
async function verifyAdminToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const tokenType = (payload as Record<string, unknown>).type;
    if (tokenType !== "admin") return null;
    const sub = payload.sub as string | undefined;
    const email = (payload as Record<string, unknown>).email as string | undefined;
    const role = (payload as Record<string, unknown>).role as AdminRole | undefined;
    if (!sub || !email || !role) return null;
    return { sub, email, role };
  } catch {
    return null;
  }
}

/**
 * Middleware: require a valid admin token.
 * Checks cookie first, then Authorization header.
 * Re-queries DB to ensure admin is still active.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token = req.cookies?.[ADMIN_COOKIE_NAME];

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: "Token admin manquant" });
    return;
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token admin invalide ou expiré" });
    return;
  }

  // Re-query DB to ensure admin is still active
  const admin = await prisma.admin.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!admin || !admin.isActive) {
    res.status(401).json({ error: "Compte admin désactivé" });
    return;
  }

  req.admin = { sub: admin.id, email: admin.email, role: admin.role };
  next();
}

/**
 * Middleware factory: require a minimum admin role.
 * SUPER_ADMIN > ADMIN > SUPPORT
 */
const ROLE_HIERARCHY: Record<AdminRole, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  SUPPORT: 1,
};

export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.admin.role] || 0;
    const minLevel = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r] || 0));

    if (userLevel < minLevel) {
      res.status(403).json({ error: "Permissions insuffisantes" });
      return;
    }

    next();
  };
}

export { ADMIN_COOKIE_NAME };
