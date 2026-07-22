"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createChangelogEntry, type CreateChangelogEntryInput } from "@/lib/data/changelog";
import { announceChangelogEntry } from "@/lib/data/updates";

/**
 * Publishes a changelog entry and, in the same action, announces it to
 * every active user on the platform (in-app/push notification + email
 * campaign, see announceChangelogEntry) — the manual counterpart to the
 * automatic GitHub release webhook (app/api/system/publish-release), for
 * announcements not tied to a release (e.g. a heads-up post).
 */
export async function publishChangelogEntryAction(input: CreateChangelogEntryInput): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!input.title.trim() || !input.description.trim()) return false;

  const entry = await createChangelogEntry(input);
  if (!entry) return false;

  await announceChangelogEntry(entry);

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return true;
}
