import "server-only";
import { createAdminClient as createSecretAdminClient } from "@supabase/server/core";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createSecretKeyFetch } from "./secret-key-fetch";

/**
 * Service-role client — bypasses Row Level Security entirely.
 * Only ever import this from Server Actions / Route Handlers.
 * Never import from a "use client" component or expose the result to the browser.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin URL and secret key are required.");

  if (key.startsWith("sb_secret_")) {
    return createSecretAdminClient({
      env: { url, secretKeys: { default: key } },
      supabaseOptions: {
        global: { fetch: createSecretKeyFetch(key) },
      },
    });
  }

  // Compatibility for projects still using the legacy JWT service_role key.
  return createSupabaseClient(
    url,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
