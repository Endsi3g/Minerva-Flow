import { createHmac, randomBytes } from "crypto";

/**
 * Signs { restaurantId, nonce, ts } into an opaque `state` param for the
 * OAuth redirect round-trip, so the callback route can trust which
 * restaurant initiated the connection without a server-side session store.
 * Reuses SUPABASE_SERVICE_ROLE_KEY as the HMAC secret — it's already a
 * required, server-only secret; no new env var needed just for this.
 */
function secret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sign OAuth state.");
  return key;
}

export function signOAuthState(restaurantId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const ts = Date.now();
  const payload = `${restaurantId}.${nonce}.${ts}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

const MAX_STATE_AGE_MS = 10 * 60 * 1000; // 10 minutes — the OAuth dance shouldn't take longer

export function verifyOAuthState(state: string): { restaurantId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [restaurantId, nonce, tsStr, signature] = decoded.split(".");
    if (!restaurantId || !nonce || !tsStr || !signature) return null;

    const payload = `${restaurantId}.${nonce}.${tsStr}`;
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    if (expected !== signature) return null;

    const ts = Number(tsStr);
    if (!Number.isFinite(ts) || Date.now() - ts > MAX_STATE_AGE_MS) return null;

    return { restaurantId };
  } catch {
    return null;
  }
}
