import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const sanitized = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].toLowerCase();

  // 1. Check if we already have a cached screenshot URL in the DB
  const card = await prisma.cardGlobal.findUnique({
    where: { url: sanitized },
    select: { rawMetadata: true },
  });

  const meta = card?.rawMetadata as Record<string, unknown> | null;
  const cachedUrl = meta?.screenshotUrl as string | undefined;

  if (cachedUrl) {
    return NextResponse.redirect(cachedUrl, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // 2. Fetch from thum.io and cache the URL in the DB
  const screenshotUrl = `https://image.thum.io/get/width/400/crop/300/noanimate/https://${sanitized}`;

  try {
    const response = await fetch(screenshotUrl);

    if (!response.ok) {
      return NextResponse.json({ error: "Screenshot service error" }, { status: 502 });
    }

    // Save the thum.io URL into rawMetadata so future requests skip thum.io entirely
    if (card) {
      await prisma.cardGlobal.update({
        where: { url: sanitized },
        data: {
          rawMetadata: {
            ...(meta ?? {}),
            screenshotUrl,
            screenshotCachedAt: new Date().toISOString(),
          },
        },
      });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch screenshot" }, { status: 500 });
  }
}
