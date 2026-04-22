import { NextRequest, NextResponse } from "next/server";
import { forgeDomain, sanitizeUrl } from "@/lib/forge";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required." }, { status: 400 });

    const cleanUrl = sanitizeUrl(url);
    if (!cleanUrl || cleanUrl.length < 3) {
      return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
    }

    // Check if already in global dictionary
    const existing = await prisma.cardGlobal.findUnique({ where: { url: cleanUrl } });
    if (existing) {
      const mintCost = calcMintCostFromAttack(existing.baseAttack);
      return NextResponse.json({ ...existing, mintCost });
    }

    const result = await forgeDomain(cleanUrl);

    // Store in global dictionary
    const card = await prisma.cardGlobal.create({
      data: {
        url: result.url,
        baseAttack: result.baseAttack,
        baseDef: result.baseDef,
        baseConnection: result.baseConnection,
        factions: result.factions,
        genesisMinted: false,
        rawMetadata: result.rawMetadata as object,
      },
    });

    return NextResponse.json({ ...card, mintCost: result.mintCost });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Forge failed." }, { status: 500 });
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
