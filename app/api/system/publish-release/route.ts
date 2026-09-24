import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createChangelogEntryAsSystem, type ChangelogCategory } from "@/lib/data/changelog";
import { announceChangelogEntry } from "@/lib/data/updates";

function categorize(title: string, body: string): ChangelogCategory {
  const text = `${title} ${body}`.toLowerCase();
  if (/\bfix\b|correctif|corrig|bug/.test(text)) return "correctif";
  if (/am[ée]lior/.test(text)) return "amelioration";
  return "fonctionnalite";
}

/**
 * GitHub release bodies are markdown; the changelog description is shown
 * through ChangelogMarkdownRenderer, which understands `code`, **bold**,
 * and [label](/path) links — so links are kept as-is (they render as
 * clickable, not stripped down to plain text) while heading markers and
 * list bullets are normalized to what the renderer expects.
 */
function cleanDescription(body: string): string {
  return body
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}

function releaseScreenshotUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash) return null;
    if (!/^\/[^/]+\/[^/]+\/releases\/download\/[^/]+\/[^/]+\.(?:png|jpe?g|webp|gif)$/i.test(url.pathname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Called by .github/workflows/publish-release.yml on every GitHub release
 * publish — turns the release into a changelog entry and fans it out via
 * announceChangelogEntry (in-app/push notification + email campaign),
 * replacing the manual "publish from admin" step that previously had to
 * follow every release by hand.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.RELEASE_WEBHOOK_SECRET || authHeader !== `Bearer ${process.env.RELEASE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as { title?: string; body?: string; imageUrl?: unknown } | null;
  const title = payload?.title?.trim();
  const rawBody = payload?.body?.trim();
  const imageUrl = releaseScreenshotUrl(payload?.imageUrl);
  if (!title || !rawBody || !imageUrl) {
    return NextResponse.json({ error: "title, body et capture GitHub (PNG/JPG/WebP/GIF) requis" }, { status: 400 });
  }

  const entry = await createChangelogEntryAsSystem({
    title,
    description: cleanDescription(rawBody),
    category: categorize(title, rawBody),
    imageUrl,
  });
  if (!entry) return NextResponse.json({ error: "Échec de création de l'entrée" }, { status: 500 });

  await announceChangelogEntry(entry);

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return NextResponse.json({ ok: true, id: entry.id });
}
