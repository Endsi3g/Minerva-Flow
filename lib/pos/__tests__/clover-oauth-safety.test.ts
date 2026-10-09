import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ tokens: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/data/pos-connections", () => ({ getPosTokens: mock.tokens, updatePosConnectionStatus: mock.status }));
import { exchangeCloverCode, getValidCloverAccessToken, validateAndFetchCloverMerchant } from "../clover";

const fetchMock = vi.fn();
const validResponse = () => ({ access_token: "test-access", refresh_token: "test-refresh", access_token_expiration: Math.floor(Date.now() / 1000) + 3600 });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("CLOVER_APP_ID", "test-app");
  vi.stubEnv("CLOVER_APP_SECRET", "test-secret");
  vi.stubEnv("CLOVER_ENVIRONMENT", "sandbox");
  mock.status.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("Clover OAuth existing connection safety", () => {
  it.each([['sandbox', 'https://apisandbox.dev.clover.com'], ['production', 'https://api.clover.com']])("exchanges %s codes only on the documented API host", async (env, base) => {
    vi.stubEnv("CLOVER_ENVIRONMENT", env);
    fetchMock.mockResolvedValue({ ok: true, json: async () => validResponse() });
    expect(await exchangeCloverCode("test-code", "https://app.test/callback")).toMatchObject({ accessToken: "test-access", refreshToken: "test-refresh" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${base}/oauth/v2/token`);
    expect(url).not.toContain("test-secret");
    expect(init).toMatchObject({ method: "POST", cache: "no-store", redirect: "error" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toMatchObject({ client_id: "test-app", client_secret: "test-secret", code: "test-code" });
  });
  it("does not retry a rejected single-use code with a secret-bearing GET", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    expect(await exchangeCloverCode("code", "https://app.test/callback")).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("does not retry or expose an uncertain token exchange", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("sensitive request details"));
    expect(await exchangeCloverCode("code", "https://app.test/callback")).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledExactlyOnceWith("clover_oauth_exchange_failed");
  });
  it.each([null, {}, { access_token: 1 }, { access_token: " " }, { access_token: "token" },
    { access_token: "token", access_token_expiration: 1 },
    { access_token: "token", access_token_expiration: "invalid" },
    { access_token: "token", access_token_expiration: Infinity },
    { access_token: "token", access_token_expiration: 1e20 },
    { ...validResponse(), refresh_token: 2 }])("rejects malformed or expired token responses %#", async data => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => data });
    expect(await exchangeCloverCode("code", "https://app.test/callback")).toBeNull();
  });
  it.each([null, "test-refresh"])("never returns an expired token even if a refresh token exists: %s", async refreshToken => {
    mock.tokens.mockResolvedValue({ accessToken: "expired-token", refreshToken, expiresAt: "2020-01-01T00:00:00Z", externalAccountId: "MERCHANT" });
    expect(await getValidCloverAccessToken("restaurant")).toBeNull();
    expect(mock.status).toHaveBeenCalledWith("restaurant", "clover", "erreur");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects an invalid persisted expiration date", async () => {
    mock.tokens.mockResolvedValue({ accessToken: "token", expiresAt: "invalid-date" });
    expect(await getValidCloverAccessToken("restaurant")).toBeNull();
  });
  it("preserves a valid current token without starting an uncoordinated refresh", async () => {
    mock.tokens.mockResolvedValue({ accessToken: "current-token", refreshToken: "refresh", expiresAt: new Date(Date.now() + 3600000).toISOString(), externalAccountId: "MERCHANT" });
    expect(await getValidCloverAccessToken("restaurant")).toEqual({ accessToken: "current-token", merchantId: "MERCHANT" });
    expect(mock.status).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires the merchant response identifier to match the requested merchant", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "OTHER", name: "Another merchant" }) });
    expect((await validateAndFetchCloverMerchant("MERCHANT", "token")).valid).toBe(false);
  });
  it("validates a matching merchant without caching or following redirects", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "MERCHANT", name: "Test restaurant" }) });
    expect(await validateAndFetchCloverMerchant("MERCHANT", "token")).toEqual({ valid: true, merchantName: "Test restaurant" });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "error" });
  });
  it("rejects a malformed merchant identifier without provider access", async () => {
    expect((await validateAndFetchCloverMerchant("../other", "token")).valid).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
