/**
 * Supabase publishable/secret API keys are API keys, not JWTs. The
 * supabase-js client normally falls back to `Authorization: Bearer <key>`;
 * for a server secret we must leave the key only in `apikey`, otherwise
 * PostgREST attempts JWT verification and rejects it.
 */
export function createSecretKeyFetch(
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    if (headers.get("authorization")?.trim() === `Bearer ${secretKey}`) {
      headers.delete("authorization");
    }
    return fetchImpl(input, { ...init, headers });
  };
}
