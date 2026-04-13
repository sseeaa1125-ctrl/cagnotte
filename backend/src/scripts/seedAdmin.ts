/**
 * Seed script — Crée le premier SUPER_ADMIN.
 * Usage: npx tsx src/scripts/seedAdmin.ts
 *
 * Variables d'environnement requises :
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 * Ou passer en arguments :
 *   npx tsx src/scripts/seedAdmin.ts admin@izy.store "MotDePasse123!" "Admin Izy"
 */
import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/auth.js";

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const name = process.argv[4] || process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("❌ Usage: npx tsx src/scripts/seedAdmin.ts <email> <password> [name]");
    console.error("   Ou définis ADMIN_EMAIL et ADMIN_PASSWORD dans .env");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("❌ Le mot de passe doit contenir au moins 12 caractères");
    process.exit(1);
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️  Admin ${email} existe déjà (role: ${existing.role})`);
    process.exit(0);
  }

  const hashedPassword = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ SUPER_ADMIN créé:`);
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Nom:   ${admin.name}`);
  console.log(`   Role:  ${admin.role}`);
}

main()
  .catch((err) => {
    console.error("❌ Erreur:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
