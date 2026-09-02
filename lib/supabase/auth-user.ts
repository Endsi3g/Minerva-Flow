import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * supabase.auth.getUser() revalidates the session against Supabase's auth
 * server on every call (safer than trusting the cookie's JWT) — but that
 * also means a single network blip on that call makes an otherwise-valid,
 * still-logged-in user look logged out. Retrying once before giving up turns
 * a transient hiccup on reload into a normal page load instead of a false
 * "no restaurant configured" wall for callers that treat a null user as
 * "not authenticated, show nothing."
 */
export async function getVerifiedUser(supabase: SupabaseClient): Promise<User | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.auth.getUser();
    if (data.user) return data.user;
    if (!error || error.name === "AuthSessionMissingError") return null;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}
