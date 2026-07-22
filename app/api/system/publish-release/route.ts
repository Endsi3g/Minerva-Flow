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

/** GitHub release bodies are markdown; the changelog description is shown as plain text. */
function cleanDescription(body: string): string {
  return body
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
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

  const payload = (await req.json().catch(() => null)) as { title?: string; body?: string } | null;
  const title = payload?.title?.trim();
  const rawBody = payload?.body?.trim();
  if (!title || !rawBody) {
    return NextResponse.json({ error: "title et body requis" }, { status: 400 });
  }

  const entry = await createChangelogEntryAsSystem({
    title,
    description: cleanDescription(rawBody),
    category: categorize(title, rawBody),
  });
  if (!entry) return NextResponse.json({ error: "Échec de création de l'entrée" }, { status: 500 });

  await announceChangelogEntry(entry);

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return NextResponse.json({ ok: true, id: entry.id });
}
