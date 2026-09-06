import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { mapCustomer, type CustomerRow } from "@/lib/data/customers";
import type { Customer } from "@/lib/types";

/**
 * Resolves the calling customer for a native-app request authenticated via
 * `Authorization: Bearer <access_token>` instead of a Supabase session
 * cookie — the only auth mechanism a native client actually has (no
 * browser, no cookie jar shared with the web app). Uses a token-scoped
 * client (anon key + the caller's own access token as the Authorization
 * header) rather than the admin client, so customers_select_own RLS is
 * still the real trust boundary here, exactly as it is for the web
 * portal's session-cookie-based requests — this is not a service-role
 * bypass, just a different way of presenting the same JWT to PostgREST.
 */
async function verifyNativeToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);

  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) return null;
  return { client, userId: user.id };
}

export async function resolveNativeCustomer(req: Request): Promise<Customer | null> {
  const verified = await verifyNativeToken(req);
  if (!verified) return null;
  const { client, userId } = verified;

  // customers_select_own (auth.uid() = user_id) is the real trust boundary
  // — using the same token-scoped `client` here (not a fresh cookie-based
  // one, which would carry no auth.uid() at all for a native caller) is
  // what makes that policy actually match this row.
  const { data, error: queryError } = await client.from("customers").select("*").eq("user_id", userId);
  if (queryError || !data || data.length === 0) return null;
  return mapCustomer(data[0] as CustomerRow, []);
}

/**
 * Just the verified caller's auth.users id, for native routes that need to
 * act on the account itself (e.g. account deletion) rather than a
 * particular customer row. Same Bearer-token verification as
 * resolveNativeCustomer, without requiring a customers row to already
 * exist for the token to be considered valid.
 */
export async function resolveNativeUserId(req: Request): Promise<string | null> {
  const verified = await verifyNativeToken(req);
  return verified?.userId ?? null;
}
