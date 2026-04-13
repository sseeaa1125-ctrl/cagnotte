import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const blockSlug = await prisma.$queryRawUnsafe<any[]>(
    "SELECT column_name::text AS column_name, data_type::text AS data_type FROM information_schema.columns WHERE table_name='Block' AND column_name='slug'"
  );
  const orderCols = await prisma.$queryRawUnsafe<any[]>(
    "SELECT column_name::text AS column_name, data_type::text AS data_type FROM information_schema.columns WHERE table_name='Order' AND column_name IN ('isAnonymous','messageIsPrivate') ORDER BY column_name"
  );
  const notifTable = await prisma.$queryRawUnsafe<any[]>(
    "SELECT table_name::text AS table_name FROM information_schema.tables WHERE table_name='Notification'"
  );
  const idxs = await prisma.$queryRawUnsafe<any[]>(
    `SELECT indexname::text AS indexname FROM pg_indexes WHERE indexname IN ('Notification_dedupeKey_key','WebhookLog_externalId_eventType_key','Block_slug_key','Block_slug_idx') ORDER BY indexname`
  );
  const enumCount = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COUNT(*)::int AS c FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='NotificationType')`
  );
  const notifCols = await prisma.$queryRawUnsafe<any[]>(
    "SELECT COUNT(*)::int AS c FROM information_schema.columns WHERE table_name='Notification'"
  );

  console.log("Block.slug             :", JSON.stringify(blockSlug));
  console.log("Order.isAnon/msgPriv   :", JSON.stringify(orderCols));
  console.log("Notification table     :", JSON.stringify(notifTable));
  console.log("Indexes (4 expected)   :", JSON.stringify(idxs));
  console.log("NotificationType enums :", JSON.stringify(enumCount), "(expect 9)");
  console.log("Notification col count :", JSON.stringify(notifCols), "(expect 13)");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
