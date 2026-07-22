"use server";

import { getLoyaltyShareByToken, joinLoyaltyProgram } from "@/lib/data/loyalty-shares";
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
  input: { name: string; email: string }
): Promise<{ ok: boolean; error?: string }> {
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`loyalty-join:${ip}`, { max: 10, windowSeconds: 300 });
  if (!allowed) return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };

  if (!input.email.trim()) return { ok: false, error: "Courriel requis." };

  const landing = await getLoyaltyShareByToken(token);
  if (!landing) return { ok: false, error: "Ce lien n'est plus valide." };

  const { ok } = await joinLoyaltyProgram(landing.restaurantId, input);
  if (!ok) return { ok: false, error: "Une erreur est survenue." };

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://minerva-flow.vercel.app";
  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({
    email: input.email.trim(),
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/portal`,
      data: { is_customer: true },
      shouldCreateUser: true,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
