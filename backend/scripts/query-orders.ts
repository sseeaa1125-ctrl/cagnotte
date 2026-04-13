import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

(async () => {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const row = await prisma.platformConfig.findUnique({
    where: { key: "payment_methods" },
  });

  if (row) {
    console.log("=== CONFIG TROUVÉE EN DB ===");
    console.log(JSON.stringify(row.value, null, 2));
  } else {
    console.log("=== AUCUNE CONFIG EN DB — les defaults du code s'appliquent ===");
  }

  await prisma.$disconnect();
  process.exit(0);
})();
