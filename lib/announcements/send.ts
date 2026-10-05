import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { sendPushToUsers } from "@/lib/push/send";
import { sendSms, isSmsConfigured } from "@/lib/sms/send";
import { parseCustomerLanguage } from "@/lib/i18n/customer-language";

const APP_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";

export type AnnouncementPayload = {
  title: string;
  /** Plain text — wrapped in the email shell's own paragraph styling, no HTML expected from the owner-authored form. */
  body: string;
  /** Relative path (e.g. "/portal") or absolute URL — defaults to /portal. */
  link?: string;
};

/**
 * "Annoncer" on /fidelisation — a manual, owner-authored broadcast (e.g.
 * "nouveaux pâtés du jour"), restaurant-scoped and marketing (CASL): only
 * marketing_consent = true customers of THIS restaurant are ever reached,
 * same rule as lib/retention/send.ts and the retention crons. Per customer:
 * email -> push (web + native) -> SMS, first one that applies wins — same
 * fallback contract as sendRetentionNudge, just with owner-authored
 * content instead of a fixed trigger template.
 */
export async function broadcastAnnouncement(
  restaurantId: string,
  restaurantName: string,
  payload: AnnouncementPayload
): Promise<{ sent: number; total: number }> {
  const admin = createAdminClient();
  const link = payload.link || "/portal";
  const absoluteLink = link.startsWith("http") ? link : `${APP_ORIGIN}${link}`;

  const { data: customerRows } = await admin
    .from("customers")
    .select("id, email, user_id, phone, name, preferred_language")
    .eq("restaurant_id", restaurantId)
    .eq("marketing_consent", true);
  const customers = (customerRows ?? []) as {
    id: string;
    email: string | null;
    user_id: string | null;
    phone: string | null;
    name: string;
    preferred_language?: string | null;
  }[];
  if (customers.length === 0) return { sent: 0, total: 0 };

  let sent = 0;
  await Promise.all(
    customers.map(async (c) => {
      let delivered = false;

      if (c.email) {
        const result = await sendTransactionalEmail({
          to: c.email,
          subject: payload.title,
          bodyHtml: `<p style="font-size: 14px; color: #3a3a35; line-height: 1.6;">${payload.body}</p>`,
          ctaLabel: parseCustomerLanguage(c.preferred_language) === "en" ? "View" : "Voir",
          ctaUrl: absoluteLink,
          language: parseCustomerLanguage(c.preferred_language),
        });
        delivered = result.ok;
      }
      if (!delivered && c.user_id) {
        await sendPushToUsers([c.user_id], { title: payload.title, body: payload.body, link }, restaurantId);
        delivered = true;
      }
      if (!delivered && isSmsConfigured() && c.phone) {
        delivered = await sendSms(c.phone, `${restaurantName} : ${payload.title} — ${payload.body}`);
      }

      if (delivered) sent++;
    })
  );

  return { sent, total: customers.length };
}
