import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma.js";
import { createAccessToken, createRefreshToken, setAuthCookies, setCsrfCookie, JWT_SECRET_BYTES } from "../lib/auth.js";
import * as logger from "../lib/logger.js";
import { formatZodError } from "../lib/zodErrors.js";
import dotenv from "dotenv";

dotenv.config();
export const googleAuthRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

// Upgrade Google profile picture URL to 400px
function upgradeGooglePicture(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/=s\d+-c/, "=s400-c");
}

const googleLoginSchema = z.object({
  // Accept either an authorization code (popup), an ID token (legacy), or a googleToken (slug step)
  code: z.string().min(1).optional(),
  idToken: z.string().min(1).optional(),
  googleToken: z.string().min(1).optional(),
  // For signup: optional slug and displayName (if new user)
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .optional(),
  displayName: z.string().min(2).max(50).optional(),
}).refine((d) => d.code || d.idToken || d.googleToken, {
  message: "Code ou token Google manquant",
});

// POST /api/auth/google — Login or Signup with Google
googleAuthRouter.post("/google", async (req, res) => {
  try {
    const data = googleLoginSchema.parse(req.body);

    let googleId: string;
    let email: string;
    let name: string | undefined;
    let picture: string | undefined;

    if (data.googleToken) {
      // ── Signed Google profile token (slug step for new users) ──
      try {
        const { payload: decoded } = await jwtVerify(data.googleToken, JWT_SECRET_BYTES);
        googleId = decoded.googleId as string;
        email = decoded.email as string;
        name = (decoded.name as string) || undefined;
        picture = upgradeGooglePicture((decoded.picture as string) || undefined);

        if (!googleId || !email) {
          res.status(401).json({ error: "Token Google invalide" });
          return;
        }
      } catch {
        res.status(401).json({ error: "Token Google expiré ou invalide. Réessaye." });
        return;
      }
    } else if (data.code) {
      // ── Authorization code flow (popup) ──
      // Exchange code for tokens
      const { tokens } = await client.getToken({
        code: data.code,
        redirect_uri: "postmessage",
      });

      if (!tokens.id_token) {
        res.status(401).json({ error: "Impossible d'obtenir le token Google" });
        return;
      }

      // Verify the ID token we received
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        res.status(401).json({ error: "Token Google invalide" });
        return;
      }

      if (!payload.email_verified) {
        res.status(400).json({ error: "L'email Google n'est pas vérifié" });
        return;
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = upgradeGooglePicture(payload.picture);
    } else if (data.idToken) {
      // ── Legacy ID token flow (One Tap) ──
      const ticket = await client.verifyIdToken({
        idToken: data.idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        res.status(401).json({ error: "Token Google invalide" });
        return;
      }

      if (!payload.email_verified) {
        res.status(400).json({ error: "L'email Google n'est pas vérifié" });
        return;
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = upgradeGooglePicture(payload.picture);
    } else {
      res.status(400).json({ error: "Code ou token Google manquant" });
      return;
    }

    // 2. Check if user exists (by googleId or email)
    // NEW-S2: Exclude soft-deleted sellers to prevent re-login after account deletion
    let seller = await prisma.seller.findFirst({
      where: {
        OR: [{ googleId }, { email }],
        deletedAt: null,
      },
    });

    if (seller) {
      // ── Existing user: login ──
      // Link Google account if not already linked
      if (!seller.googleId) {
        await prisma.seller.update({
          where: { id: seller.id },
          data: { googleId, emailVerified: true },
        });
      }

      // Update avatar from Google if user has no avatar
      if (!seller.avatarUrl && picture) {
        await prisma.seller.update({
          where: { id: seller.id },
          data: { avatarUrl: picture },
        });
      }

      const accessToken = await createAccessToken({
        sub: seller.id,
        slug: seller.slug,
        plan: seller.plan,
      });
      const refreshToken = await createRefreshToken(seller.id);

      setAuthCookies(res, accessToken, refreshToken);
      const csrfToken = setCsrfCookie(res); // S6: CSRF double-submit cookie

      // S6b: csrfToken in body for cross-domain
      res.json({
        isNewUser: false,
        csrfToken,
        seller: {
          id: seller.id,
          email: seller.email,
          slug: seller.slug,
          displayName: seller.displayName,
          plan: seller.plan,
          onboardingCompleted: seller.onboardingCompleted,
        },
      });
      return;
    }

    // ── New user: auto-create account ──
    // M4: Slugs réservés partagés
    const { RESERVED_SLUGS } = await import("../lib/constants.js");

    // Generate slug from name or email
    const baseName = data.slug || name || email.split("@")[0];
    let slug = baseName
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);

    if (slug.length < 3) slug = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 20);
    if (slug.length < 3) slug = "user";

    // S15: If the generated slug is reserved, append a suffix
    if (RESERVED_SLUGS.has(slug)) {
      slug = `${slug}-shop`;
    }

    // Ensure slug uniqueness
    // S16: Max 20 attempts to prevent infinite loop
    let finalSlug = slug;
    let attempt = 0;
    const MAX_SLUG_ATTEMPTS = 20;
    while (attempt < MAX_SLUG_ATTEMPTS) {
      const existing = await prisma.seller.findUnique({ where: { slug: finalSlug } });
      if (!existing) break;
      attempt++;
      finalSlug = `${slug.slice(0, 25)}-${attempt}`;
    }
    if (attempt >= MAX_SLUG_ATTEMPTS) {
      // Fallback to a random suffix
      finalSlug = `${slug.slice(0, 20)}-${crypto.randomBytes(4).toString("hex")}`;
    }

    // Check if a soft-deleted record exists with this email
    const deletedSeller = await prisma.seller.findFirst({
      where: { email }
    });

    let newSeller;
    if (deletedSeller) {
      // Un-delete and relink existing account
      newSeller = await prisma.seller.update({
        where: { id: deletedSeller.id },
        data: {
          deletedAt: null,
          googleId,
          emailVerified: true,
          slug: finalSlug, // Might overwrite their old slug if we want a fresh start, or we can keep it
          displayName: data.displayName || name || email.split("@")[0],
          avatarUrl: picture || deletedSeller.avatarUrl,
        },
      });
    } else {
      // If this slug was someone's old slug, remove the redirect — new owner takes priority
      await prisma.slugHistory.deleteMany({ where: { oldSlug: finalSlug } });
      // Create new seller (no password needed for Google users)
      newSeller = await prisma.seller.create({
        data: {
          email,
          password: null, // S2: Google users don't have a password
          googleId,
          emailVerified: true,
          slug: finalSlug,
          displayName: data.displayName || name || email.split("@")[0],
          avatarUrl: picture || null,
        },
      });
    }

    const accessToken = await createAccessToken({
      sub: newSeller.id,
      slug: newSeller.slug,
      plan: newSeller.plan,
    });
    const refreshToken = await createRefreshToken(newSeller.id);

    setAuthCookies(res, accessToken, refreshToken);
    const csrfToken = setCsrfCookie(res); // S6: CSRF double-submit cookie

    // S6b: csrfToken in body for cross-domain
    res.status(201).json({
      isNewUser: true,
      csrfToken,
      seller: {
        id: newSeller.id,
        email: newSeller.email,
        slug: newSeller.slug,
        displayName: newSeller.displayName,
        plan: newSeller.plan,
        onboardingCompleted: newSeller.onboardingCompleted,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodError(err) });
      return;
    }
    logger.error("Erreur Google auth", err);
    res.status(500).json({ error: "Erreur lors de l'authentification Google", details: (err as any)?.response?.data || (err instanceof Error ? err.message : String(err)) });
  }
});
