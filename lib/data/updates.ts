import "server-only";
import type { ChangelogEntry } from "@/lib/data/changelog";
import { notifyAllUsers } from "@/lib/data/notifications";
import { sendChangelogCampaignEmail } from "@/lib/email/resend";

/**
 * Fans a published changelog entry out to every active platform user across
 * both channels: an in-app/push notification (immediate, works on mobile
 * and desktop today) and an email campaign (durable copy, currently a
 * no-op until a verified Resend domain is set — see
 * sendChangelogCampaignEmail's doc comment). Shared by the manual admin
 * publish action and the automatic GitHub release webhook so both paths
 * behave identically.
 */
export async function announceChangelogEntry(entry: ChangelogEntry): Promise<void> {
  await notifyAllUsers({
    type: "changelog.published",
    title: "Mise à jour disponible",
    body: `${entry.title} — rechargez l'application et consultez le journal des mises à jour.`,
    link: "/changelog",
  });

  await sendChangelogCampaignEmail({
    title: entry.title,
    description: entry.description,
    link: "/changelog",
  });
}
