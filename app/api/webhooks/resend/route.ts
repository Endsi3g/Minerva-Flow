import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend signs webhooks the Svix way (https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests):
 * base64(HMAC-SHA256(secretBytes, `${svixId}.${svixTimestamp}.${rawBody}`)),
 * compared against one of the space-separated `v1,<sig>` values in
 * svix-signature. The `resend` package has no verification helper and this
 * project doesn't depend on `svix` for anything else, so this mirrors the
 * existing hand-rolled HMAC check in app/api/webhooks/square/route.ts
 * rather than adding a dependency for one function.
 */
function verifySignature(id: string, timestamp: string, body: string, signatureHeader: string | null): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signatureHeader
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter((sig): sig is string => Boolean(sig))
    .some((sig) => {
      const sigBuf = Buffer.from(sig);
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
    });
}

type ResendWebhookEvent = {
  type: string; // e.g. "email.delivered", "email.opened", "email.clicked"
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
    click?: { link: string };
  };
};

/**
 * Receives Resend delivery/engagement events for every email this app sends
 * (lifecycle onboarding, billing lifecycle, customer retention nudges) and
 * logs them to email_events, correlated by resend_email_id to the
 * `metadata.resend_id` already stamped on user_lifecycle_emails and
 * customer_retention_sends when the email was sent. Registered once via
 * the Resend dashboard/API against this exact URL.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !verifySignature(svixId, svixTimestamp, body, svixSignature)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const event = JSON.parse(body) as ResendWebhookEvent;
  const eventType = event.type?.replace(/^email\./, "");
  if (!eventType || !event.data?.email_id) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  await admin.from("email_events").insert({
    resend_email_id: event.data.email_id,
    event_type: eventType,
    recipient: event.data.to?.[0] ?? null,
    link_url: event.data.click?.link ?? null,
    occurred_at: event.created_at,
    metadata: event.data,
  });

  return NextResponse.json({ received: true });
}
