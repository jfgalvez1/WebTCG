import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/marketplace — fetch all active listings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const rarity = searchParams.get("rarity") ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const listings = await prisma.listing.findMany({
    include: {
      seller: { select: { id: true, username: true } },
      inventory: {
        include: {
          card: true,
        },
      },
    },
    orderBy: sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
      ? { price: "desc" }
      : { createdAt: "desc" },
  });

  const filtered = listings.filter((l) => {
    if (q && !l.inventory.url.toLowerCase().includes(q.toLowerCase())) return false;
    if (rarity && l.inventory.rarity !== rarity) return false;
    return true;
  });

  return NextResponse.json({ listings: filtered });
}

// POST /api/marketplace — create a new listing
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { instanceId, price, coinType } = body as {
    instanceId?: string;
    price?: number;
    coinType?: "STANDARD" | "PREMIUM";
  };

  if (!instanceId || typeof price !== "number" || price < 1) {
    return NextResponse.json({ error: "instanceId and price (≥1) required" }, { status: 400 });
  }
  if (coinType && coinType !== "STANDARD" && coinType !== "PREMIUM") {
    return NextResponse.json({ error: "coinType must be STANDARD or PREMIUM" }, { status: 400 });
  }

  // Confirm the card belongs to this user
  const inventory = await prisma.userInventory.findUnique({
    where: { instanceId },
    include: { listing: true },
  });

  if (!inventory) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (inventory.ownerId !== session.user.id) {
    return NextResponse.json({ error: "You don't own this card" }, { status: 403 });
  }
  if (inventory.listing) {
    return NextResponse.json({ error: "Card is already listed" }, { status: 409 });
  }

  const listing = await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      instanceId,
      price,
      coinType: coinType ?? "STANDARD",
    },
    include: {
      seller: { select: { id: true, username: true } },
      inventory: { include: { card: true } },
    },
  });

  return NextResponse.json({ listing });
}
