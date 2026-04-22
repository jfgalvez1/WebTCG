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

    // Use a transaction to prevent race conditions (true 1-of-1 guarantee)
    const result = await prisma.$transaction(async (tx) => {
      const freshCard = await tx.cardGlobal.findUnique({ where: { url } });
      if (!freshCard) throw new Error("Card not found.");

      // Check if this card is already owned by anyone — enforce 1-of-1
      const existingOwner = await tx.userInventory.findUnique({ where: { url } });
      if (existingOwner) {
        throw new Error("This card is already owned by another player. Every card is 1-of-1.");
      }

      if (user.premiumCoins < mintCost) {
        throw new Error(`Insufficient premium coins. Need ${mintCost}, have ${user.premiumCoins}.`);
      }

      // Mark genesis as minted
      await tx.cardGlobal.update({ where: { url }, data: { genesisMinted: true } });

      // Deduct coins
      await tx.user.update({
        where: { id: user.id },
        data: { premiumCoins: { decrement: mintCost } },
      });

      // Add to inventory as GENESIS 1-of-1
      const instance = await tx.userInventory.create({
        data: {
          ownerId: user.id,
          url,
          rarity: "GENESIS",
        },
      });

      return { instance, rarity: "GENESIS", cost: mintCost };
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transaction failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Premium coin cost mirrors the new ATK tier scale (1–15):
// Legendary ≥13 | Boss ≥9 | Standard ≥5 | Fodder ≥2 | Trash
function calcMintCostFromAttack(attack: number): number {
  if (attack >= 13) return 50_000;
  if (attack >= 9) return 10_000;
  if (attack >= 5) return 1_000;
  if (attack >= 2) return 200;
  return 50;
}
