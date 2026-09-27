import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNativeOwnerContext } from "@/lib/supabase/bearer-user";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockCreateAdmin = vi.mocked(createAdminClient);

function setupAdmin(user: { id: string } | null, membership: { role: string; status: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: membership, error: null });
  const eqStatus = vi.fn().mockReturnValue({ maybeSingle });
  const eqUser = vi.fn().mockReturnValue({ eq: eqStatus });
  const eqRestaurant = vi.fn().mockReturnValue({ eq: eqUser });
  const select = vi.fn().mockReturnValue({ eq: eqRestaurant });
  const admin = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: user ? null : new Error("invalid token") }) },
    from: vi.fn().mockReturnValue({ select }),
  };
  mockCreateAdmin.mockReturnValue(admin as never);
  return admin;
}

describe("native owner bearer authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects missing bearer tokens before querying Supabase", async () => {
    const admin = setupAdmin(null, null);
    const result = await getNativeOwnerContext(new Request("https://minervaflow.app/api/native/owner"), "restaurant-1");

    expect(result).toEqual({ error: "Authentification requise.", status: 401 });
    expect(admin.auth.getUser).not.toHaveBeenCalled();
  });

  it("requires a requested tenant and a valid Supabase user", async () => {
    expect(await getNativeOwnerContext(new Request("https://minervaflow.app/api/native/owner", { headers: { Authorization: "Bearer valid" } }), null))
      .toEqual({ error: "Restaurant manquant.", status: 400 });
    setupAdmin(null, null);
    expect(await getNativeOwnerContext(new Request("https://minervaflow.app/api/native/owner", { headers: { Authorization: "Bearer expired" } }), "restaurant-1"))
      .toEqual({ error: "Session invalide ou expirée.", status: 401 });
  });

  it("permits an owner only for an active membership in the requested restaurant", async () => {
    setupAdmin({ id: "owner-1" }, { role: "owner", status: "active" });
    const request = new Request("https://minervaflow.app/api/native/owner", { headers: { Authorization: "Bearer owner-session" } });

    await expect(getNativeOwnerContext(request, "restaurant-1")).resolves.toEqual({ context: { userId: "owner-1", restaurantId: "restaurant-1" } });
    const admin = mockCreateAdmin.mock.results.at(-1)?.value as ReturnType<typeof setupAdmin>;
    expect(admin.auth.getUser).toHaveBeenCalledWith("owner-session");
    expect(admin.from).toHaveBeenCalledWith("restaurant_members");
  });

  it("denies customer or inactive membership roles", async () => {
    const request = new Request("https://minervaflow.app/api/native/owner", { headers: { Authorization: "Bearer member-session" } });
    setupAdmin({ id: "customer-1" }, { role: "customer", status: "active" });
    await expect(getNativeOwnerContext(request, "restaurant-1")).resolves.toEqual({ error: "Accès réservé à l’équipe de gestion.", status: 403 });
    setupAdmin({ id: "former-owner" }, { role: "owner", status: "inactive" });
    await expect(getNativeOwnerContext(request, "restaurant-1")).resolves.toEqual({ error: "Aucun accès à cet espace.", status: 403 });
  });
});
