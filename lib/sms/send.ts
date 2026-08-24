import twilio from "twilio";

/**
 * Twilio isn't available as a Vercel Marketplace integration (only Resend
 * shows up under the "messaging" category as of this writing) — wired
 * directly via API key instead, same best-effort contract as lib/push/send.ts
 * so a missing/misconfigured SMS provider never breaks the caller.
 */
export function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
  );
}

let client: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!isSmsConfigured()) return null;
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  }
  return client;
}

/**
 * Sends a single SMS. Never throws — a failed send must not break the
 * retention/campaign flow that triggered it; callers just don't get a
 * successful delivery logged.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  const c = getClient();
  if (!c) return false;

  try {
    await c.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER!, body });
    return true;
  } catch (err) {
    console.error("SMS send failed:", err);
    return false;
  }
}
