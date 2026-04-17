import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { JWT_SECRET_BYTES } from "./auth.js";

// Re-export password utilities from auth.ts — no duplication
export { hashPassword, verifyPassword } from "./auth.js";

// ── Cookie names ──
export const ADMIN_COOKIE_NAME = "izy-admin-token";
export const ADMIN_REFRESH_COOKIE_NAME = "izy-admin-refresh";
export const ADMIN_CSRF_COOKIE_NAME = "izy-admin-csrf";

// ── Expiry ──
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_MAX_AGE = REFRESH_COOKIE_MAX_AGE;

// ── Token payload ──
export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "SUPPORT";
  name: string;
  aud: "admin";
}

// ── Token creation ──

export async function createAdminAccessToken(
  payload: AdminTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES);
}

export async function createAdminRefreshToken(sub: string): Promise<string> {
  return new SignJWT({ sub, type: "refresh", aud: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES);
}

// ── Token verification ──

export async function verifyAdminToken(
  token: string,
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const raw = payload as Record<string, unknown>;
    // Reject refresh tokens used as access tokens
    if (raw.type === "refresh") return null;
    // Reject non-admin tokens
    if (raw.aud !== "admin") return null;
    return raw as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyAdminRefreshToken(
  token: string,
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const raw = payload as Record<string, unknown>;
    if (raw.type !== "refresh") return null;
    if (raw.aud !== "admin") return null;
    const sub = payload.sub as string | undefined;
    if (!sub) return null;
    return { sub };
  } catch {
    return null;
  }
}

// ── Cookies ──

export function setAdminAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(ADMIN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  res.cookie(ADMIN_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/admin/auth",
  });
}

export function clearAdminAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/admin/auth",
  });
}

export function setAdminCsrfCookie(res: Response): string {
  const isProd = process.env.NODE_ENV === "production";
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie(ADMIN_CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JS
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
  });
  return csrfToken;
}

export function clearAdminCsrfCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(ADMIN_CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
}

/**
 * Middleware: verify admin CSRF token on state-changing requests.
 * Mirrors verifyCsrf from lib/auth.ts but uses admin-specific cookie.
 */
export function verifyAdminCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[ADMIN_CSRF_COOKIE_NAME];
  const headerToken = req.headers["x-csrf-token"] as string | undefined;

  if (!headerToken) {
    res.status(403).json({ error: "Token CSRF invalide" });
    return;
  }

  if (cookieToken) {
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);
    if (
      cookieBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      res.status(403).json({ error: "Token CSRF invalide" });
      return;
    }
  }

  next();
}
