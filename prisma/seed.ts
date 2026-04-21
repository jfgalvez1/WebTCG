import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo user
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@webtcg.dev" },
    update: {},
    create: {
      username: "DemoSysAdmin",
      email: "demo@webtcg.dev",
      passwordHash,
      standardCoins: 1000,
      premiumCoins: 500,
    },
  });

  console.log(`✓ Created demo user: ${demoUser.email}`);

  // Pre-populate some cards in the global dictionary
  const seedCards = [
    { url: "google.com", baseAttack: 8, baseDef: 52, baseConnection: 65, factions: ["Tech"], genesisMinted: false },
    { url: "github.com", baseAttack: 5, baseDef: 32, baseConnection: 60, factions: ["Tech"], genesisMinted: false },
    { url: "reddit.com", baseAttack: 5, baseDef: 38, baseConnection: 67, factions: ["Social", "Media"], genesisMinted: false },
    { url: "twitch.tv", baseAttack: 5, baseDef: 26, baseConnection: 67, factions: ["Gaming", "Social"], genesisMinted: false },
    { url: "wikipedia.org", baseAttack: 5, baseDef: 46, baseConnection: 55, factions: ["Education"], genesisMinted: false },
  ];

  for (const card of seedCards) {
    await prisma.cardGlobal.upsert({
      where: { url: card.url },
      update: {},
      create: {
        ...card,
        rawMetadata: { source: "seed" },
      },
    });
  }

  // Give the demo user some starter cards
  await prisma.userInventory.createMany({
    skipDuplicates: true,
    data: [
      { ownerId: demoUser.id, url: "github.com", rarity: "COMMON" },
      { ownerId: demoUser.id, url: "reddit.com", rarity: "COMMON" },
      { ownerId: demoUser.id, url: "twitch.tv", rarity: "COMMON" },
    ],
  });

  console.log("✓ Seeded starter cards for demo user");
  console.log("\n🎮 Demo credentials:");
  console.log("   Email:    demo@webtcg.dev");
  console.log("   Password: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
