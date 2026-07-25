import { createClient } from "@/lib/supabase/client";

/** Mirrors AuthCard.tsx's mapErrorMessage — Supabase's raw auth error strings
 * (English, developer-facing) must never reach an end customer placing an
 * order. */
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit")) {
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  }
  if (normalized.includes("invalid email") || normalized.includes("unable to validate email")) {
    return "Cette adresse courriel semble invalide.";
  }
  return "Impossible d'envoyer le lien pour l'instant. Réessayez dans un instant.";
}

/**
 * Passwordless sign-in for the customer portal / public referral flow.
 * `data: { is_customer: true }` is read by handle_new_user() (Postgres
 * trigger) to skip the default-restaurant provisioning that every other
 * new auth.users row gets — without this flag a customer would become the
 * "owner" of a fake restaurant and get bounced to /onboarding.
 * Client-side only (uses window.location.origin + the browser client),
 * matching how the rest of the app's auth calls are made (see AuthCard.tsx).
 */
export async function requestCustomerMagicLink(
  email: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { is_customer: true },
      shouldCreateUser: true,
    },
  });

  if (error) return { ok: false, error: friendlyAuthError(error.message) };
  return { ok: true };
}
