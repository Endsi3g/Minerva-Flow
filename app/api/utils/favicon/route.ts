import { NextResponse } from "next/server";
import { extractDomain, getRestaurantFaviconUrl } from "@/lib/utils/favicon";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Le paramètre 'url' est requis." }, { status: 400 });
  }

  const domain = extractDomain(rawUrl);
  const faviconUrl = getRestaurantFaviconUrl(rawUrl, 128);

  return NextResponse.json({
    domain,
    faviconUrl,
    fallbackUrl: `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  });
}
