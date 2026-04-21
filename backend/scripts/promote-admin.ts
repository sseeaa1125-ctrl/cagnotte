/**
 * Promote a user to a given admin role, or create the admin if they don't
 * exist yet. Same helper used for the manual KYC script — bypasses the UI
 * for bootstrapping / recovery scenarios.
 *
 * Usage:
 *   cd backend
 *   # Promote an existing admin OR create one with a temp password
 *   npx tsx scripts/promote-admin.ts <email> [SUPER_ADMIN|ADMIN|SUPPORT] [--name="..."] [--password=<pwd>]
 *
 * Examples:
 *   npx tsx scripts/promote-admin.ts mass.kane@gmail.com SUPER_ADMIN
 *   npx tsx scripts/promote-admin.ts mass.kane@gmail.com SUPER_ADMIN --name="Mass Kane"
 *
 * If the admin doesn't exist and no password is provided, a temporary one
 * is generated and printed to stdout. The user must change it on first login.
 */

import "dotenv/config";
import crypto from "crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";
import { logAdminAction } from "../src/lib/adminLog.js";

// NOTE: le cache `evictAdminCache` vit dans le process du backend (in-memory
// Map 30s TTL). Un script externe ne peut pas l'invalider. Le backend
// ré-interrogera la DB quand le TTL expire (30s max). Acceptable pour un
// bootstrap / promotion ponctuelle.

type AdminRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT";
const ROLES: readonly AdminRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT"];

function parseFlag(argv: string[], prefix: string): string | null {
  const f = argv.find((a) => a.startsWith(prefix));
  return f ? f.slice(prefix.length) : null;
}

function generateTempPassword(): string {
  // 16 hex chars = 64 bits of entropy. Force the user to rotate on first login.
  return crypto.randomBytes(8).toString("hex");
}

async function main(): Promise<void> {
  const [, , emailArg, roleArgRaw, ...rest] = process.argv;

  if (!emailArg) {
    console.error(
      "Usage: tsx scripts/promote-admin.ts <email> [SUPER_ADMIN|ADMIN|SUPPORT] [--name=\"...\"] [--password=<pwd>]",
    );
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const role = (roleArgRaw || "SUPER_ADMIN").toUpperCase() as AdminRole;
  if (!ROLES.includes(role)) {
    console.error(`Rôle invalide: ${role}. Valides: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const customName = parseFlag(rest, "--name=");
  const customPassword = parseFlag(rest, "--password=");

  const existing = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  const actor = process.env.USER || "script";
  const ts = new Date().toISOString();

  if (existing) {
    if (existing.role === role && existing.isActive) {
      console.log(
        `[${ts}] Admin ${email} est déjà ${role} (actif). Rien à faire.`,
      );
      await prisma.$disconnect();
      return;
    }
    const updated = await prisma.admin.update({
      where: { id: existing.id },
      data: { role, isActive: true },
      select: { id: true, role: true, isActive: true },
    });
    await logAdminAction(
      updated.id,
      "ADMIN_ROLE_CHANGED_VIA_SCRIPT",
      `admin:${updated.id}`,
      { from: existing.role, to: updated.role, actor },
    );
    console.log(
      `[${ts}] ✓ ${email} : ${existing.role}${existing.isActive ? "" : " (inactif)"} → ${updated.role} (actif). adminId=${updated.id}`,
    );
    await prisma.$disconnect();
    return;
  }

  // Création
  const name = customName || email.split("@")[0];
  const password = customPassword || generateTempPassword();
  const passwordHash = await hashPassword(password);

  const created = await prisma.admin.create({
    data: { email, name, password: passwordHash, role, isActive: true },
    select: { id: true, email: true, role: true, name: true },
  });
  await logAdminAction(
    created.id,
    "ADMIN_CREATED_VIA_SCRIPT",
    `admin:${created.id}`,
    { role: created.role, actor },
  );

  console.log(`[${ts}] ✓ Admin créé : ${created.email} (${created.role}) adminId=${created.id}`);
  if (!customPassword) {
    console.log("");
    console.log("┌─────────────────────────────────────────────┐");
    console.log("│ MOT DE PASSE TEMPORAIRE (à changer au login)│");
    console.log("├─────────────────────────────────────────────┤");
    console.log(`│ ${password.padEnd(43)} │`);
    console.log("└─────────────────────────────────────────────┘");
    console.log("Transmets ce mot de passe par canal sécurisé (pas email).");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
