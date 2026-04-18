import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const inventory = await prisma.userInventory.findMany({
      where: { ownerId: session.user.id },
      include: {
        card: true,
        listing: { select: { id: true, price: true } },
      },
      orderBy: { dateAcquired: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, standardCoins: true, premiumCoins: true, username: true },
    });

    return NextResponse.json({ inventory, user });
  } catch {
    return NextResponse.json({ error: "Failed to load inventory." }, { status: 500 });
  }
}
