import "server-only";
import type { ChangelogEntry } from "@/lib/data/changelog";
import { notifyAllUsers } from "@/lib/data/notifications";
import { sendChangelogCampaignEmail } from "@/lib/email/resend";

/**
 * Fans a published changelog entry out to every active platform user across
 * both channels: an in-app/push notification to active app users and a
 * best-effort email campaign sent only to the curated, active product-update
 * opt-in segment. If Resend is unavailable, no campaign is sent; this path
 * never expands the audience to the full account roster. Shared by the
 * manual admin publish action and the GitHub release webhook. Entries with
 * audience "client" are not announced here.
 */
export async function announceChangelogEntry(entry: ChangelogEntry): Promise<void> {
  // A client-only entry is for customers: it must never push or email
  // restaurant owners/staff (this fan-out only reaches restaurant members and
  // the owner product-updates segment). Customers see it on their "Nouveautés"
  // page; there is no customer push channel here.
  if (entry.audience === "client") return;

  await notifyAllUsers({
    type: "changelog.published",
    title: "Mise à jour disponible",
    body: `${entry.title} — rechargez l'application et consultez le journal des mises à jour.`,
    link: "/changelog",
  });

  await sendChangelogCampaignEmail({
    title: entry.title,
    description: entry.description,
    category: entry.category,
    link: "/changelog",
  });
}
