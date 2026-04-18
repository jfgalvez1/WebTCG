import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/marketplace/buy — purchase a listed card
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { listingId } = (await req.json()) as { listingId?: string };
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { inventory: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "You cannot buy your own listing" }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!buyer) {
    return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  }
  if (buyer.standardCoins < listing.price) {
    return NextResponse.json(
      { error: `Not enough coins. Need ${listing.price}, have ${buyer.standardCoins}` },
      { status: 402 }
    );
  }

  // Atomic transaction: deduct buyer coins, credit seller coins, transfer card, delete listing
  await prisma.$transaction([
    // Deduct from buyer
    prisma.user.update({
      where: { id: session.user.id },
      data: { standardCoins: { decrement: listing.price } },
    }),
    // Credit seller
    prisma.user.update({
      where: { id: listing.sellerId },
      data: { standardCoins: { increment: listing.price } },
    }),
    // Transfer card ownership
    prisma.userInventory.update({
      where: { instanceId: listing.instanceId },
      data: {
        ownerId: session.user.id,
        dateAcquired: new Date(),
      },
    }),
    // Remove the listing
    prisma.listing.delete({ where: { id: listingId } }),
  ]);

  return NextResponse.json({ success: true, url: listing.inventory.url });
}
