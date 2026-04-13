import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      seller?: TokenPayload;
    }
  }
}

// P1: Cache court en mémoire pour éviter 1 query DB par requête authentifiée
// TTL 30s — assez court pour détecter les changements de plan/suppression
const AUTH_CACHE_TTL = 30_000;
const authCache = new Map<string, { plan: string; slug: string; expiresAt: number }>();

// Nettoyage périodique toutes les 5min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authCache) {
    if (v.expiresAt <= now) authCache.delete(k);
  }
}, 5 * 60 * 1000);

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Check cookie first, then fallback to Authorization header
  let token = req.cookies?.["izy-token"];
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    res.status(401).json({ error: "Token manquant" });
    return;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: "Token invalide ou expiré" });
    return;
  }

  // P1: Check in-memory cache first
  const cached = authCache.get(payload.sub);
  if (cached && cached.expiresAt > Date.now()) {
    req.seller = { ...payload, plan: cached.plan as "FREE" | "PRO", slug: cached.slug };
    next();
    return;
  }

  // H7: Re-query plan from DB to prevent stale JWT bypass
  // NEW-S1: Filter deletedAt to block soft-deleted sellers with valid JWT
  const freshSeller = await prisma.seller.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { plan: true, slug: true },
  });
  if (!freshSeller) {
    authCache.delete(payload.sub);
    res.status(401).json({ error: "Compte introuvable" });
    return;
  }

  // P1: Cache le résultat 30s
  authCache.set(payload.sub, {
    plan: freshSeller.plan,
    slug: freshSeller.slug,
    expiresAt: Date.now() + AUTH_CACHE_TTL,
  });

  req.seller = { ...payload, plan: freshSeller.plan, slug: freshSeller.slug };
  next();
}
