import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const rarity = searchParams.get("rarity") ?? "ALL";
  const owner = searchParams.get("owner")?.toLowerCase().trim() ?? "";

  try {
    const items = await prisma.userInventory.findMany({
      include: {
        card: {
          select: {
            baseAttack: true,
            baseDef: true,
            baseConnection: true,
            factions: true,
            genesisMinted: true,
            createdAt: true,
            rawMetadata: true,
          },
        },
        owner: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { dateAcquired: "desc" },
      take: 500,
    });

    const filtered = items.filter((item) => {
      if (rarity !== "ALL" && item.rarity !== rarity) return false;
      if (q && !item.url.toLowerCase().includes(q)) return false;
      if (owner && !item.owner.username.toLowerCase().includes(owner)) return false;
      return true;
    });

    return NextResponse.json({ items: filtered, total: filtered.length });
  } catch {
    return NextResponse.json({ error: "Failed to load registry." }, { status: 500 });
  }
}
