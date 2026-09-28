"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createChangelogEntry, type CreateChangelogEntryInput } from "@/lib/data/changelog";
import { announceChangelogEntry } from "@/lib/data/updates";

function isTrustedChangelogScreenshot(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const image = new URL(value);
    const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    const localDevelopment = process.env.NODE_ENV !== "production"
      && ["localhost", "127.0.0.1"].includes(supabase.hostname);
    const secureTransport = image.protocol === "https:" || (localDevelopment && image.protocol === "http:");
    return secureTransport
      && image.origin === supabase.origin
      && !image.username
      && !image.password
      && !image.search
      && !image.hash
      && image.pathname.startsWith("/storage/v1/object/public/changelog-images/changelog/");
  } catch {
    return false;
  }
}

/**
 * Publishes a changelog entry and, in the same action, announces it to
 * every active user on the platform (in-app/push notification + email
 * campaign, see announceChangelogEntry) — the manual counterpart to the
 * automatic GitHub release webhook (app/api/system/publish-release), for
 * announcements not tied to a release (e.g. a heads-up post).
 */
export async function publishChangelogEntryAction(input: CreateChangelogEntryInput): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!input || typeof input.title !== "string" || typeof input.description !== "string") return false;
  if (!input.title.trim() || input.title.length > 200 || !input.description.trim() || input.description.length > 2000) return false;
  if (!(input.category === "fonctionnalite" || input.category === "amelioration" || input.category === "correctif")) return false;
  if (!isTrustedChangelogScreenshot(input.imageUrl)) return false;

  const entry = await createChangelogEntry(input);
  if (!entry) return false;

  await announceChangelogEntry(entry);

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return true;
}
