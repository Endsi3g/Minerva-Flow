"use server";

import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/data/admin";
import { createChangelogEntry, type CreateChangelogEntryInput } from "@/lib/data/changelog";
import { notifyAllUsers } from "@/lib/data/notifications";

/**
 * Publishes a changelog entry and, in the same action, notifies every
 * active user on the platform to reload the app and check /changelog —
 * this is the "notification pour toutes les mises à jour" mechanism: it
 * fires once per publish, not automatically on deploy.
 */
export async function publishChangelogEntryAction(input: CreateChangelogEntryInput): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!input.title.trim() || !input.description.trim()) return false;

  const entry = await createChangelogEntry(input);
  if (!entry) return false;

  await notifyAllUsers({
    type: "changelog.published",
    title: "Mise à jour disponible",
    body: `${entry.title} — rechargez l'application et consultez le journal des mises à jour.`,
    link: "/changelog",
  });

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return true;
}
