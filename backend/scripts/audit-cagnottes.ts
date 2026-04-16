import { prisma } from "../src/lib/prisma.js";
(async () => {
  const total = await prisma.block.count({ where: { type: "FUNDRAISER" } });
  const active = await prisma.block.count({ where: { type: "FUNDRAISER", isActive: true } });
  const sample = await prisma.block.findMany({
    where: { type: "FUNDRAISER" },
    select: { id: true, slug: true, isActive: true, config: true, seller: { select: { deletedAt: true, slug: true } } },
    take: 15,
    orderBy: { createdAt: "desc" },
  });
  console.log("total=%d active=%d", total, active);
  for (const s of sample) {
    const c = s.config as any;
    console.log("block %s | slug=%s | isActive=%s | vis=%s | status=%s | sellerDeleted=%s | sellerSlug=%s",
      s.id.slice(0, 8), s.slug, s.isActive, c?.visibility, c?.status, s.seller?.deletedAt, s.seller?.slug);
  }
  process.exit(0);
})();
