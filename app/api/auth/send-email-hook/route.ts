import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendCustomerOtpEmail } from "@/lib/email/customer-otp";
import { sendAuthActionEmail } from "@/lib/email/resend";

/**
 * Supabase Auth's "Send Email" hook — once enabled project-wide (Dashboard
 * → Authentication → Hooks), Supabase stops sending auth emails itself and
 * POSTs the email payload here instead for every single auth email type
 * (magic link, signup confirmation, recovery, email change, invite). That's
 * why this branches on email_action_type rather than only handling the one
 * case (customer OTP) this was built for — leaving the other branches
 * unhandled would silently break staff signup/password reset the moment
 * this hook is turned on.
 *
 * Payload shape and header names are the Standard Webhooks spec Supabase
 * uses for this hook: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */

type SendEmailPayload = {
  user: { email: string; user_metadata?: Record<string, unknown> };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

export async function POST(req: Request) {
  const secretEnv = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secretEnv) {
    console.error("SEND_EMAIL_HOOK_SECRET not configured");
    return NextResponse.json({ error: { http_code: 500, message: "Hook not configured" } }, { status: 500 });
  }

  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  let payload: SendEmailPayload;
  try {
    const secret = secretEnv.replace("v1,whsec_", "");
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, headers) as SendEmailPayload;
  } catch {
    return NextResponse.json({ error: { http_code: 401, message: "Invalid signature" } }, { status: 401 });
  }

  const { user, email_data } = payload;
  const isCustomer = user.user_metadata?.is_customer === true;

  try {
    if (isCustomer && (email_data.email_action_type === "magiclink" || email_data.email_action_type === "email")) {
      const result = await sendCustomerOtpEmail({ to: user.email, code: email_data.token });
      if (!result.ok) throw new Error("Resend send failed");
    } else {
      const verifyUrl = `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      const result = await sendAuthActionEmail({ to: user.email, actionType: email_data.email_action_type, verifyUrl });
      if (!result.ok) throw new Error("Resend send failed");
    }
  } catch (err) {
    console.error("send-email-hook: delivery failed", err);
    return NextResponse.json({ error: { http_code: 500, message: "Email delivery failed" } }, { status: 500 });
  }

  return NextResponse.json({});
}
