import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ rpc: vi.fn(), upsert: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => {
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mock.maybeSingle, upsert: mock.upsert };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  return { rpc: mock.rpc, from: vi.fn(() => query) };
} }));
import { getPosTokens, savePosConnectionTokens } from "../pos-connections";

beforeEach(() => { vi.clearAllMocks(); mock.upsert.mockResolvedValue({ error: null }); });
describe("POS connection persistence must not announce false success", () => {
  it.each(['clover', 'square', 'lightspeed', 'quickbooks', 'toast'] as const)("persists %s only after both secrets are saved", async provider => {
    mock.rpc.mockResolvedValueOnce({ data: "access-id", error: null }).mockResolvedValueOnce({ data: "refresh-id", error: null });
    await savePosConnectionTokens("restaurant", provider, { accessToken: "test-access", refreshToken: "test-refresh", externalAccountId: "MERCHANT" });
    expect(mock.upsert).toHaveBeenCalledWith(expect.objectContaining({ provider, access_token_id: "access-id", refresh_token_id: "refresh-id", status: "connecte" }), { onConflict: "restaurant_id,provider" });
  });
  it.each([{ data: null, error: { message: "storage error" } }, { data: null, error: null }])("does not mark connected after access secret storage failure %#", async result => {
    mock.rpc.mockResolvedValue(result);
    await expect(savePosConnectionTokens("restaurant", "clover", { accessToken: "test-access" })).rejects.toThrow("pos_access_token_storage_failed");
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("does not mark connected after refresh secret storage failure", async () => {
    mock.rpc.mockResolvedValueOnce({ data: "access-id", error: null }).mockResolvedValueOnce({ data: null, error: { message: "storage error" } });
    await expect(savePosConnectionTokens("restaurant", "clover", { accessToken: "access", refreshToken: "refresh" })).rejects.toThrow("pos_refresh_token_storage_failed");
    expect(mock.upsert).not.toHaveBeenCalled();
  });
  it("reports failure when the connection row cannot be saved", async () => {
    mock.rpc.mockResolvedValue({ data: "access-id", error: null });
    mock.upsert.mockResolvedValue({ error: { message: "database error" } });
    await expect(savePosConnectionTokens("restaurant", "clover", { accessToken: "access" })).rejects.toThrow("pos_connection_storage_failed");
  });
  it("does not retrieve Clover secrets for a failed or pending connection", async () => {
    mock.maybeSingle.mockResolvedValue({ data: { access_token_id: "access-id", status: "erreur" }, error: null });
    expect(await getPosTokens("restaurant", "clover")).toBeNull();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("fails closed on database or Vault read errors", async () => {
    mock.maybeSingle.mockResolvedValue({ data: { access_token_id: "access-id", status: "connecte" }, error: { message: "db error" } });
    expect(await getPosTokens("restaurant", "clover")).toBeNull();
    expect(mock.rpc).not.toHaveBeenCalled();
    mock.maybeSingle.mockResolvedValue({ data: { access_token_id: "access-id", status: "connecte" }, error: null });
    mock.rpc.mockResolvedValue({ data: "not-trusted", error: { message: "vault error" } });
    expect(await getPosTokens("restaurant", "clover")).toBeNull();
  });
  it("retrieves an active connection with valid Vault reads", async () => {
    mock.maybeSingle.mockResolvedValue({ data: { access_token_id: "access-id", refresh_token_id: "refresh-id", status: "connecte", external_account_id: "MERCHANT", expires_at: null }, error: null });
    mock.rpc.mockResolvedValueOnce({ data: "access", error: null }).mockResolvedValueOnce({ data: "refresh", error: null });
    expect(await getPosTokens("restaurant", "clover")).toEqual({ accessToken: "access", refreshToken: "refresh", expiresAt: null, externalAccountId: "MERCHANT" });
  });
});
