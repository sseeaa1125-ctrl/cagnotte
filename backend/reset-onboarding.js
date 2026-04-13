import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.seller.updateMany({
    data: { onboardingCompleted: false, deletedAt: null },
  });
  console.log(`Reset onboarding for ${result.count} users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
