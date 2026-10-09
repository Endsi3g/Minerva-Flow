import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ user: vi.fn(), membership: vi.fn(), exchange: vi.fn(), merchant: vi.fn(), save: vi.fn(), after: vi.fn(), backfill: vi.fn() }));
vi.mock("next/server", async importOriginal => ({ ...await importOriginal<typeof import("next/server")>(), after: mock.after }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/auth-user", () => ({ getVerifiedUser: mock.user }));
vi.mock("@/lib/data/current-restaurant", () => ({ getCurrentMembership: mock.membership }));
vi.mock("@/lib/data/pos-connections", () => ({ savePosConnectionTokens: mock.save }));
vi.mock("@/lib/pos/clover", () => ({ exchangeCloverCode: mock.exchange, validateAndFetchCloverMerchant: mock.merchant }));
vi.mock("@/lib/pos/sync", () => ({ backfillPosHistory: mock.backfill }));

import { signOAuthState, verifyOAuthState } from "@/lib/ad-platforms/state";
import { GET as launch } from "../route";
import { GET as callback } from "../callback/route";

const owner = { restaurantId: "restaurant", role: "owner" };
const request = () => new Request("https://www.minervaflow.app/api/oauth/clover");
function state(extra = { provider: "clover", userId: "owner-id", environment: "sandbox" }) {
  return signOAuthState("restaurant", JSON.stringify(extra));
}
function returnRequest(value = state(), merchant = "MERCHANT") {
  const url = new URL("https://www.minervaflow.app/api/oauth/clover/callback");
  url.searchParams.set("code", "test-code"); url.searchParams.set("state", value);
  if (merchant) url.searchParams.set("merchant_id", merchant);
  return new Request(url);
}
function error(response: Response) { return new URL(response.headers.get("location")!).searchParams.get("pos_error"); }

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CLOVER_APP_ID", "test-app"); vi.stubEnv("CLOVER_APP_SECRET", "test-secret");
  vi.stubEnv("CLOVER_ENVIRONMENT", "sandbox"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "unit-test-state-signing-key");
  mock.user.mockResolvedValue({ id: "owner-id" }); mock.membership.mockResolvedValue(owner);
  mock.exchange.mockResolvedValue({ accessToken: "test-access", refreshToken: "test-refresh", expiresAt: "2026-10-10T12:00:00Z" });
  mock.merchant.mockResolvedValue({ valid: true }); mock.save.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("Clover OAuth launch authorization", () => {
  it("does not launch an unconfigured integration", async () => {
    vi.stubEnv("CLOVER_APP_SECRET", "");
    expect((await launch(request())).status).toBe(503);
    expect(mock.user).not.toHaveBeenCalled();
  });
  it("does not launch without a verified user", async () => {
    mock.user.mockResolvedValue(null);
    expect((await launch(request())).status).toBe(403);
    expect(mock.membership).not.toHaveBeenCalled();
  });
  it.each([null, { ...owner, role: "staff" }, { ...owner, role: "customer" }])("does not launch for membership %s", async membership => {
    mock.membership.mockResolvedValue(membership);
    expect((await launch(request())).status).toBe(403);
  });
  it.each(["owner", "manager"])("binds the signed state to the initiating %s, restaurant and environment", async role => {
    mock.membership.mockResolvedValue({ ...owner, role });
    const result = await launch(request());
    const target = new URL(result.headers.get("location")!);
    expect(target.origin).toBe("https://sandbox.dev.clover.com");
    expect(target.pathname).toBe("/oauth/v2/authorize");
    const verified = verifyOAuthState(target.searchParams.get("state")!);
    expect(verified?.restaurantId).toBe("restaurant");
    expect(JSON.parse(verified!.extra!)).toEqual({ provider: "clover", userId: "owner-id", environment: "sandbox" });
    expect(target.searchParams.has("client_secret")).toBe(false);
  });
});

describe("Clover OAuth callback authorization and persistence", () => {
  it.each(["", "../other"])("rejects an absent or invalid merchant ID: %s", async merchant => {
    expect(error(await callback(returnRequest(state(), merchant)))).toBe("clover_missing_params");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it("rejects an invalid signature", async () => {
    expect(error(await callback(returnRequest("tampered-state")))).toBe("clover_invalid_state");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it("requires a new connection when returning from an old unbound state", async () => {
    expect(error(await callback(returnRequest(signOAuthState("restaurant"))))).toBe("clover_invalid_state");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it.each([{ provider: "square", userId: "owner-id", environment: "sandbox" }, { provider: "clover", userId: "owner-id", environment: "production" }])("rejects a mismatched provider or environment %s", async extra => {
    expect(error(await callback(returnRequest(state(extra))))).toBe("clover_invalid_state");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it("rejects a different returning user", async () => {
    mock.user.mockResolvedValue({ id: "other-user" });
    expect(error(await callback(returnRequest()))).toBe("clover_unauthorized");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it("rejects a logged-out returning session", async () => {
    mock.user.mockResolvedValue(null);
    expect(error(await callback(returnRequest()))).toBe("clover_unauthorized");
    expect(mock.exchange).not.toHaveBeenCalled();
  });
  it.each([null, { ...owner, role: "staff" }, { ...owner, role: "customer" }, { ...owner, restaurantId: "other-restaurant" }])("rejects lost or wrong restaurant management rights: %s", async membership => {
    mock.membership.mockResolvedValue(membership);
    expect(error(await callback(returnRequest()))).toBe("clover_unauthorized");
    expect(mock.exchange).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
  });
  it("does not save a failed token exchange", async () => {
    mock.exchange.mockResolvedValue(null);
    expect(error(await callback(returnRequest()))).toBe("clover_token_exchange_failed");
    expect(mock.merchant).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled();
  });
  it("does not save an unverified merchant", async () => {
    mock.merchant.mockResolvedValue({ valid: false });
    expect(error(await callback(returnRequest()))).toBe("clover_merchant_validation_failed");
    expect(mock.save).not.toHaveBeenCalled(); expect(mock.after).not.toHaveBeenCalled();
  });
  it("does not save if management rights are revoked during the provider round trip", async () => {
    mock.membership.mockResolvedValueOnce(owner).mockResolvedValueOnce({ ...owner, role: "customer" });
    expect(error(await callback(returnRequest()))).toBe("clover_unauthorized");
    expect(mock.save).not.toHaveBeenCalled(); expect(mock.after).not.toHaveBeenCalled();
  });
  it("does not announce connected or schedule imports on a storage error", async () => {
    mock.save.mockRejectedValue(new Error("vault failure"));
    const result = await callback(returnRequest());
    expect(error(result)).toBe("clover_connection_storage_failed");
    expect(new URL(result.headers.get("location")!).searchParams.has("pos_connected")).toBe(false);
    expect(mock.after).not.toHaveBeenCalled();
  });
  it.each(["owner", "manager"])("connects a verified merchant for the initiating active %s", async role => {
    mock.membership.mockResolvedValue({ ...owner, role });
    const result = await callback(returnRequest());
    expect(new URL(result.headers.get("location")!).searchParams.get("pos_connected")).toBe("clover");
    expect(mock.merchant).toHaveBeenCalledWith("MERCHANT", "test-access");
    expect(mock.save).toHaveBeenCalledWith("restaurant", "clover", expect.objectContaining({ accessToken: "test-access", externalAccountId: "MERCHANT" }));
    expect(mock.after).toHaveBeenCalledOnce();
  });
});
