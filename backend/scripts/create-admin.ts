import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import bcryptjs from "bcryptjs";

async function main() {
  const hash = bcryptjs.hashSync("Settat2015", 12);

  const admin = await prisma.admin.upsert({
    where: { email: "amadoufinances@gmail.com" },
    update: { password: hash, role: "SUPER_ADMIN", isActive: true },
    create: { email: "amadoufinances@gmail.com", password: hash, name: "Amadou", role: "SUPER_ADMIN", isActive: true },
  });

  console.log("Admin cree:", admin.id, admin.email, admin.role);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
