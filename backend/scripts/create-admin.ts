import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/adminAuth.js";

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email || !name || !password) {
    console.error(
      'Usage: npx tsx scripts/create-admin.ts <email> "<name>" <password>',
    );
    process.exit(1);
  }

  const hashedPw = await hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      name,
      password: hashedPw,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      email,
      name,
      password: hashedPw,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(
    `Admin créé/mis à jour : ${admin.email} (${admin.role}) — id: ${admin.id}`,
  );
}

main()
  .catch((err) => {
    console.error("Erreur:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
