import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  const sanitized = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  const screenshotUrl = `https://image.thum.io/get/width/400/crop/300/noanimate/https://${sanitized}`;

  try {
    const response = await fetch(screenshotUrl, {
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Screenshot service error" }, { status: 502 });
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
