import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";

const rawSecret = process.env.JWT_SECRET;
if (!rawSecret) {
  throw new Error("JWT_SECRET est requis. Définis-le dans .env");
}
export const JWT_SECRET_BYTES = new TextEncoder().encode(rawSecret);

export const COOKIE_NAME = "izy-token";
export const REFRESH_COOKIE_NAME = "izy-refresh";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_MAX_AGE = REFRESH_COOKIE_MAX_AGE; // Used by CSRF cookie

/**
 * Set the auth cookie on a response.
 * - sameSite "none" + secure in production (cross-origin Vercel→Railway)
 * - sameSite "lax" in development (localhost same-site)
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: "/api/auth", // Only sent to auth endpoints
  });
}


export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/api/auth",
  });
}



export interface TokenPayload {
  sub: string;
  slug: string;
  plan: "FREE" | "PRO";
  onboardingCompleted?: boolean;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES);
}

export async function createRefreshToken(sub: string): Promise<string> {
  return new SignJWT({ sub, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET_BYTES);
}


export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    // M11: Block refresh tokens from being used as access tokens
    const tokenType = (payload as Record<string, unknown>).type;
    if (tokenType === "refresh") return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * BUG-6 FIX: Verify a refresh token specifically.
 * Unlike verifyToken(), this ONLY accepts refresh tokens.
 * Returns { sub } or null if invalid/expired/not-refresh.
 */
export async function verifyRefreshToken(
  token: string
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const tokenType = (payload as Record<string, unknown>).type;
    if (tokenType !== "refresh") return null;
    const sub = payload.sub as string | undefined;
    if (!sub) return null;
    return { sub };
  } catch {
    return null;
  }
}

// ── S6: CSRF Protection (Double-Submit Cookie Pattern) ──
export const CSRF_COOKIE_NAME = "izy-csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Set a CSRF token cookie (readable by JS, NOT httpOnly).
 * Called after login/signup so the frontend can read it and send it back as a header.
 */
export function setCsrfCookie(res: Response): string {
  const isProd = process.env.NODE_ENV === "production";
  const csrfToken = crypto.randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JS
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE,
  });
  return csrfToken;
}

export function clearCsrfCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
}

/**
 * Middleware: verify CSRF token on state-changing requests (POST, PUT, PATCH, DELETE).
 * The cookie value must match the X-CSRF-Token header value.
 * Skips GET, HEAD, OPTIONS (safe methods).
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // S2b: Custom header alone is sufficient CSRF protection (OWASP pattern).
  // Cross-origin requests can't set custom headers without CORS preflight,
  // so the header presence proves same-origin. Fallback for proxy cookie issues.
  if (!headerToken) {
    res.status(403).json({ error: "Token CSRF invalide" });
    return;
  }

  // If cookie is also present, verify double-submit match (timing-safe)
  if (cookieToken) {
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);
    if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
      res.status(403).json({ error: "Token CSRF invalide" });
      return;
    }
  }

  next();
}
