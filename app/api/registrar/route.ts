import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required." }, { status: 400 });

    const card = await prisma.cardGlobal.findUnique({ where: { url } });
    if (!card) return NextResponse.json({ error: "Card not forged. Run /api/forge first." }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const mintCost = calcMintCostFromAttack(card.baseAttack);
    const cloneCost = Math.round(mintCost * 0.3);

    // Use a transaction to prevent race conditions (the 1-of-1 guarantee)
    const result = await prisma.$transaction(async (tx) => {
      const freshCard = await tx.cardGlobal.findUnique({ where: { url } });
      if (!freshCard) throw new Error("Card not found.");

      const isGenesis = !freshCard.genesisMinted;
      const cost = isGenesis ? mintCost : cloneCost;
      const rarity = isGenesis ? "GENESIS" : "CLONE";

      if (user.premiumCoins < cost) {
        throw new Error(`Insufficient premium coins. Need ${cost}, have ${user.premiumCoins}.`);
      }

      // Mark genesis as minted
      if (isGenesis) {
        await tx.cardGlobal.update({ where: { url }, data: { genesisMinted: true } });
      }

      // Deduct coins
      await tx.user.update({
        where: { id: user.id },
        data: { premiumCoins: { decrement: cost } },
      });

      // Add to inventory
      const instance = await tx.userInventory.create({
        data: {
          ownerId: user.id,
          url,
          rarity,
        },
      });

      return { instance, rarity, cost, isGenesis };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transaction failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function calcMintCostFromAttack(attack: number): number {
  if (attack >= 8) return 10_000;
  if (attack >= 5) return 1_000;
  if (attack >= 3) return 200;
  return 50;
}
