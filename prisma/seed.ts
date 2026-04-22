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

  // Pre-populate some cards using the Connection = (ATK+DEF)/2 + Effect Tax formula.
  // ATK: log10 visit scale (1–15). DEF: age step table (2–14).
  const seedCards = [
    // google.com: 90B visits→ATK 15, 26yrs→DEF 14. (15+14)/2=14.5 → conn 15
    { url: "google.com",    baseAttack: 15, baseDef: 14, baseConnection: 15, factions: ["Tech"],                genesisMinted: false },
    // github.com: 800M visits→ATK 9, 16yrs→DEF 10. (9+10)/2=9.5 → conn 10
    { url: "github.com",    baseAttack: 9,  baseDef: 10, baseConnection: 10, factions: ["Tech"],                genesisMinted: false },
    // reddit.com: 4B visits→ATK 12, 19yrs→DEF 10. (12+10)/2=11 → conn 11
    { url: "reddit.com",    baseAttack: 12, baseDef: 10, baseConnection: 11, factions: ["Social", "Media"],     genesisMinted: false },
    // twitch.tv: 1.2B visits→ATK 12, 13yrs→DEF 8. (12+8)/2=10 → conn 10
    { url: "twitch.tv",     baseAttack: 12, baseDef: 8,  baseConnection: 10, factions: ["Gaming", "Social"],   genesisMinted: false },
    // wikipedia.org: 5B visits→ATK 12, 23yrs→DEF 12. (12+12)/2=12 → conn 12
    { url: "wikipedia.org", baseAttack: 12, baseDef: 12, baseConnection: 12, factions: ["Education"],           genesisMinted: false },
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
