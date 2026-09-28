import { describe, expect, it, vi } from "vitest";
import { createSecretKeyFetch } from "../secret-key-fetch";

describe("createSecretKeyFetch", () => {
  const secret = "sb_secret_test_only";

  it("keeps a secret API key in apikey and strips its non-JWT bearer fallback", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const fetchWithSecret = createSecretKeyFetch(secret, fetchImpl);

    await fetchWithSecret("https://project.supabase.co/rest/v1/restaurants", {
      headers: { authorization: `Bearer ${secret}`, apikey: secret },
    });

    const sentHeaders = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(sentHeaders.get("apikey")).toBe(secret);
    expect(sentHeaders.has("authorization")).toBe(false);
  });

  it("preserves user JWTs and unrelated authorization values", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const fetchWithSecret = createSecretKeyFetch(secret, fetchImpl);
    await fetchWithSecret("https://project.supabase.co/rest/v1/restaurants", {
      headers: { authorization: "Bearer user-session-jwt", apikey: secret },
    });

    const sentHeaders = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(sentHeaders.get("authorization")).toBe("Bearer user-session-jwt");
    expect(sentHeaders.get("apikey")).toBe(secret);
  });
});
