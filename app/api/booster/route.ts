import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { drawBoosterPack, forgeDomain } from "@/lib/forge";

const BOOSTER_COST = 100;

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

    const cards = await drawBoosterPack();

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
              genesisMinted: false,
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
