import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";
import { e2eTestDatabase } from "./test-env";
import { createTestUser, cleanupTestUser, supabaseAdmin, TEST_PASSWORD, type TestUser } from "./fixtures";

test("native bearer API connects a new customer by QR with real RLS", async ({ request }) => {
  test.setTimeout(90_000);
  let owner: TestUser | undefined;
  let customerUserId: string | undefined;
  let restaurantId: string | undefined;
  try {
    owner = await createTestUser("native-qr-owner");
    const { data: membership, error: membershipError } = await supabaseAdmin.from("restaurant_members")
      .select("restaurant_id").eq("user_id", owner.id).single();
    expect(membershipError).toBeNull();
    restaurantId = membership!.restaurant_id;
    const token = randomBytes(24).toString("hex");
    const { error: shareError } = await supabaseAdmin.from("loyalty_shares")
      .insert({ restaurant_id: restaurantId, token, title: "E2E QR", created_by: owner.id });
    expect(shareError).toBeNull();
    const email = `e2e-native-qr-${Date.now()}@example.com`;
    const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password: TEST_PASSWORD, email_confirm: true,
      user_metadata: { is_customer: true, full_name: "Exemple QR E2E", product_updates_opt_in: false },
    });
    expect(authError).toBeNull();
    customerUserId = auth.user!.id;
    const customerClient = createClient(e2eTestDatabase.supabaseUrl, e2eTestDatabase.anonKey,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: session, error: sessionError } = await customerClient.auth.signInWithPassword({ email, password: TEST_PASSWORD });
    expect(sessionError).toBeNull();
    const headers = { Authorization: `Bearer ${session.session!.access_token}` };
    const { count: before, error: beforeError } = await customerClient.from("customers")
      .select("id", { count: "exact", head: true }).eq("user_id", customerUserId);
    expect(beforeError).toBeNull();
    expect(before).toBe(0);
    expect((await request.get(`/api/portal/scan/${token}`)).status()).toBe(401);
    expect((await request.get("/api/portal/scan/invalid-e2e-token", { headers })).status()).toBe(404);
    const resolved = await request.get(`/api/portal/scan/${token}`, { headers });
    expect(resolved.status()).toBe(200);
    expect((await resolved.json()).restaurantId).toBe(restaurantId);
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data: joined, error: joinError } = await customerClient.rpc("join_restaurant_as_customer", { p_restaurant_id: restaurantId }).single();
      expect(joinError).toBeNull();
      expect(joined.user_id).toBe(customerUserId);
    }
    const { count: after } = await customerClient.from("customers")
      .select("id", { count: "exact", head: true }).eq("user_id", customerUserId);
    expect(after).toBe(1);
    const restaurant = await request.get("/api/portal/restaurant", { headers });
    expect(restaurant.status()).toBe(200);
    expect((await restaurant.json()).name).toBe("Mon restaurant");
    const memberships = await request.get("/api/portal/restaurants", { headers });
    expect(memberships.status()).toBe(200);
    expect((await memberships.json()).memberships).toEqual([
      expect.objectContaining({ restaurantId, restaurantName: "Mon restaurant" }),
    ]);
  } finally {
    if (customerUserId) {
      await supabaseAdmin.from("customers").delete().eq("user_id", customerUserId);
      await cleanupTestUser(customerUserId);
    }
    if (restaurantId) await supabaseAdmin.from("loyalty_shares").delete().eq("restaurant_id", restaurantId);
    if (owner) await cleanupTestUser(owner.id);
  }
});
