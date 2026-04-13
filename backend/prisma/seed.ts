import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)();

async function main() {
  const awa = await prisma.seller.create({
    data: {
      email: "awa@test.com",
      password: await bcrypt.hash("password123", 12),
      emailVerified: true,
      slug: "awa",
      displayName: "Awa Fitness",
      bio: "Coach sportive · Dakar",
      instagramUrl: "https://instagram.com/awafitness",
      whatsappNumber: "+221771234567",
      themeId: "default",
      plan: "PRO",
      payoutPhone: "+221771234567",
      payoutProvider: "wave",
    },
  });

  console.log(`✅ Seller créé : ${awa.displayName} (${awa.slug}.fari.store)`);

  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "LINK",
      position: 0,
      config: {
        title: "Mon Instagram",
        url: "https://instagram.com/awafitness",
        icon: "instagram",
      },
    },
  });
  console.log("✅ Bloc LINK créé");

  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "SALE",
      position: 1,
      config: {},
      product: {
        create: {
          title: "Programme Été 2026",
          description: "PDF + 12 vidéos d'entraînement pour être au top cet été",
          price: 15000,
          coverUrl: "https://placeholder.com/cover.jpg",
          fileUrl: "https://placeholder.com/programme.pdf",
          fileName: "programme-ete-2026.pdf",
          fileSize: 5242880,
        },
      },
    },
  });
  console.log("✅ Bloc SALE + Product créés");

  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "BOOKING",
      position: 2,
      config: {},
      bookingService: {
        create: {
          title: "Coaching privé 1h",
          description: "Séance personnalisée à mon studio",
          price: 10000,
          duration: 60,
          location: "Studio Almadies, Dakar",
          minAdvanceHours: 24,
          slots: {
            create: [
              { dayOfWeek: 0, startTime: "09:00", endTime: "12:00" },
              { dayOfWeek: 0, startTime: "14:00", endTime: "17:00" },
              { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
              { dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
            ],
          },
        },
      },
    },
  });
  console.log("✅ Bloc BOOKING + Service + Slots créés");

  await prisma.block.create({
    data: {
      sellerId: awa.id,
      type: "PAYMENT",
      position: 3,
      config: {
        title: "Envoie-moi un paiement",
        description: "Facture, tip, ou montant libre",
        suggestedAmounts: [5000, 10000, 25000],
        minAmount: 1000,
      },
    },
  });
  console.log("✅ Bloc PAYMENT créé");
  console.log("\n🎉 Seed terminé ! Vendeur Awa avec 4 blocs.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
