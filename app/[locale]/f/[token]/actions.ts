"use server";

import { getLoyaltyShareByToken, joinLoyaltyProgram } from "@/lib/data/loyalty-shares";
import { recordTouchpointEventByCode } from "@/lib/data/physical-touchpoints";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Public self-enrollment: creates the customer row for this restaurant (if
 * this email isn't already a member — see joinLoyaltyProgram), then sends
 * the same passwordless magic link as sendPortalLinkAction. The link lands
 * on /auth/confirm, which verifies the OTP; handle_new_user() (migration
 * 0024) links this new/pre-existing customers row to the resulting
 * auth.users.id by matching email, so /portal shows their points on the
 * very first login.
 */
export async function joinLoyaltyProgramAction(
  token: string,
  input: { name: string; email: string; marketingConsent: boolean; birthday?: string | null; language?: "fr" | "en" },
  touchpointCode?: string | null
): Promise<{ ok: false; error: string } | { ok: true; emailSent: boolean }> {
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`loyalty-join:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };

  if (!input.email.trim()) return { ok: false, error: "Courriel requis." };

  const landing = await getLoyaltyShareByToken(token);
  if (!landing) return { ok: false, error: "Ce lien n'est plus valide." };

  const { ok, alreadyMember } = await joinLoyaltyProgram(landing.restaurantId, input);
  if (!ok) return { ok: false, error: "Une erreur est survenue." };

  // Attribution: this join arrived via a physical touchpoint tap (the /t/
  // redirect appended ?tp=<code>, threaded down from page.tsx) — credit the
  // exact NFC tag/sticker/chevalet that drove it, not just "someone joined."
  // A retry after an email delivery error is idempotent. Do not count that
  // retry as a second visit or loyalty activation for the same touchpoint.
  if (touchpointCode && !alreadyMember) {
    await recordTouchpointEventByCode(touchpointCode, "venue_joined");
    await recordTouchpointEventByCode(touchpointCode, "loyalty_activated");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://minervaflow.app";
  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({
    email: input.email.trim(),
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/portal`,
      data: { is_customer: true },
      shouldCreateUser: true,
    },
  });

  if (error) {
    // The customer row is already persisted. Keep the signup successful and
    // let the customer retry the sign-in email instead of implying their
    // enrollment was lost (Supabase can rate-limit OTP email delivery).
    console.error("joinLoyaltyProgramAction: OTP email could not be sent:", error.message);
    return { ok: true, emailSent: false };
  }
  return { ok: true, emailSent: true };
}

export async function recordFormStartedAction(restaurantId: string): Promise<void> {
  try {
    const { recordLifecycleEvent } = await import("@/lib/data/lifecycle-events");
    await recordLifecycleEvent({
      restaurantId,
      eventType: "form_started",
    });
  } catch {
    // Non-blocking
  }
}
