import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import bcryptjs from "bcryptjs";

async function main() {
  const email = process.argv[2];
  const newPwd = process.argv[3];
  if (!email || !newPwd) {
    console.error("Usage: npx tsx scripts/update-admin-pwd.ts <email> <newPwd>");
    process.exit(2);
  }
  const hash = bcryptjs.hashSync(newPwd, 12);
  const updated = await prisma.admin.update({
    where: { email },
    data: { password: hash },
    select: { id: true, email: true, role: true, isActive: true, name: true },
  });
  console.log("OK admin password updated:", updated);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
