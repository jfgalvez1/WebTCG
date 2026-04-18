import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forgeDomain, BOOSTER_PACK_POOL } from "@/lib/forge";

const BOOSTER_COST = 100;
const PACK_SIZE = 5;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (user.standardCoins < BOOSTER_COST) {
      return NextResponse.json(
        { error: `Insufficient coins. Need ${BOOSTER_COST} standard coins.` },
        { status: 400 }
      );
    }

    // Find URLs already owned by anyone — every card is 1-of-1
    const ownedInventory = await prisma.userInventory.findMany({
      select: { url: true },
    });
    const ownedUrls = new Set(ownedInventory.map((i) => i.url));

    // Filter the pool to only unclaimed URLs, then shuffle and pick PACK_SIZE
    const available = BOOSTER_PACK_POOL.filter((url) => !ownedUrls.has(url));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, PACK_SIZE);

    if (selected.length === 0) {
      return NextResponse.json(
        { error: "All booster pack cards are currently claimed. Try again later or use the Registrar." },
        { status: 409 }
      );
    }

    const cards = await Promise.all(selected.map(forgeDomain));

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { standardCoins: { decrement: BOOSTER_COST } },
      });

      const instances = await Promise.all(
        cards.map(async (card) => {
          // Upsert into global dictionary
          await tx.cardGlobal.upsert({
            where: { url: card.url },
            update: {},
            create: {
              url: card.url,
              baseAttack: card.baseAttack,
              baseHealth: card.baseHealth,
              factions: card.factions,
              genesisMinted: true,
              rawMetadata: card.rawMetadata as object,
            },
          });

          return tx.userInventory.create({
            data: { ownerId: user.id, url: card.url, rarity: "COMMON" },
          });
        })
      );

      return instances;
    });

    // Return full card data
    const fullCards = await Promise.all(
      result.map(async (inst) => {
        const cardData = await forgeDomain(inst.url);
        return { ...inst, ...cardData };
      })
    );

    return NextResponse.json({ cards: fullCards });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to open booster pack." }, { status: 500 });
  }
}
