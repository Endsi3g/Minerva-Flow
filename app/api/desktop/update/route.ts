import { NextResponse } from "next/server";
import { latestDesktopRelease } from "@/lib/desktop/releases";

/**
 * Update manifest read by the desktop app (Tauri updater). It serves the
 * latest.json of the newest PUBLISHED desktop release, so a draft never
 * reaches installed apps and "latest release" on GitHub (which may be a web
 * release) cannot break updates. 204 means "no update available".
 */
export async function GET() {
  const release = await latestDesktopRelease();
  if (!release?.updaterManifestUrl) return new NextResponse(null, { status: 204 });
  try {
    const response = await fetch(release.updaterManifestUrl, { next: { revalidate: 600 } });
    if (!response.ok) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
