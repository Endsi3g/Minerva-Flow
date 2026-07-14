import { getGoogleTokens } from "@/lib/data/google-connections";

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function buildMimeMessage({ to, subject, html }: { to: string; subject: string; html: string }): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  return Buffer.from(message, "utf8").toString("base64url");
}

/**
 * Sends an email through the restaurant's connected Gmail account (not a
 * third-party provider — Gmail API `users.messages.send`, scoped to
 * gmail.send only, can't read the mailbox). Silently returns false on
 * failure — the weekly-report cron treats Gmail as a bonus channel on top
 * of the in-app notification, never a hard dependency.
 */
export async function sendReportEmail(
  restaurantId: string,
  { to, subject, html }: { to: string; subject: string; html: string }
): Promise<boolean> {
  const tokens = await getGoogleTokens(restaurantId);
  if (!tokens) return false;

  const raw = buildMimeMessage({ to, subject, html });

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  return res.ok;
}
