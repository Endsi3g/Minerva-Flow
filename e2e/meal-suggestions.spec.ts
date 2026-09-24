import { test, expect } from "@playwright/test";
import {
  cleanupOrphanRestaurants,
  cleanupTestUser,
  createTestUser,
  loginAs,
  supabaseAdmin,
  type TestUser,
} from "./fixtures";

test.describe("Customer meal ideas and owner draft workflow", () => {
  let user: TestUser;
  let restaurantId = "";
  let customerId = "";
  let menuShareId = "";
  let suggestionId = "";
  let draftItemId = "";
  let token = "";
  let suggestionTitle = "";

  test.beforeEach(async () => {
    user = await createTestUser("meal-suggestion");
    const { data: membership, error: membershipError } = await supabaseAdmin.from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();
    if (membershipError || !membership) {
      throw new Error(`Test restaurant was not provisioned: ${membershipError?.message}`);
    }
    restaurantId = membership.restaurant_id;

    const [{ data: customer, error: customerError }, { data: share, error: shareError }] = await Promise.all([
      supabaseAdmin.from("customers")
        .insert({ restaurant_id: restaurantId, user_id: user.id, name: "E2E Customer", email: user.email })
        .select("id")
        .single(),
      supabaseAdmin.from("menu_shares")
        .insert({ restaurant_id: restaurantId, token: `e2e-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: "E2E suggestion menu", created_by: user.id })
        .select("id, token")
        .single(),
    ]);
    if (customerError || !customer) throw new Error(`Test customer could not be created: ${customerError?.message}`);
    if (shareError || !share) throw new Error(`Test menu share could not be created: ${shareError?.message}`);
    customerId = customer.id;
    menuShareId = share.id;
    token = share.token;
    suggestionTitle = `E2E seasonal bowl ${Date.now()}`;
  });

  test.afterEach(async () => {
    if (suggestionId) {
      const { error } = await supabaseAdmin.from("meal_suggestions").delete()
        .eq("id", suggestionId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test suggestion cleanup failed: ${error.message}`);
    }
    if (draftItemId) {
      const { error } = await supabaseAdmin.from("menu_items").delete()
        .eq("id", draftItemId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test draft cleanup failed: ${error.message}`);
    }
    if (customerId && restaurantId) {
      const { error } = await supabaseAdmin.from("customers").delete()
        .eq("id", customerId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test customer cleanup failed: ${error.message}`);
    }
    if (menuShareId && restaurantId) {
      const { error } = await supabaseAdmin.from("menu_shares").delete()
        .eq("id", menuShareId)
        .eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test menu share cleanup failed: ${error.message}`);
    }
    if (user?.id) await cleanupTestUser(user.id);
    if (restaurantId) await cleanupOrphanRestaurants([restaurantId]);
  });

  test("customer submits and votes, then the owner creates an unpublished draft", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAs(page, user);
    await page.goto(`/fr/m/${token}`);
    await expect(page.getByRole("heading", { name: "Suggérer un plat" })).toBeVisible();
    await page.getByRole("textbox", { name: "Idée de plat" }).fill(suggestionTitle);
    await page.getByRole("textbox", { name: "Précisions facultatives" }).fill("Option végétarienne, allergènes à confirmer.");
    await page.getByRole("button", { name: "Suggérer", exact: true }).click();
    await expect(page.getByText(suggestionTitle, { exact: true })).toBeVisible();

    const { data: submitted, error: submitError } = await supabaseAdmin.from("meal_suggestions")
      .select("id, restaurant_id, customer_id, status")
      .eq("restaurant_id", restaurantId)
      .eq("title", suggestionTitle)
      .single();
    expect(submitError).toBeNull();
    expect(submitted).toMatchObject({ restaurant_id: restaurantId, customer_id: customerId, status: "open" });
    suggestionId = submitted!.id;

    await page.getByRole("button", { name: "0", exact: true }).click();
    await expect(page.getByRole("button", { name: "1", exact: true })).toHaveAttribute("aria-pressed", "true");
    const { count: voteCount, error: voteError } = await supabaseAdmin.from("meal_suggestion_votes")
      .select("customer_id", { count: "exact", head: true })
      .eq("suggestion_id", suggestionId)
      .eq("customer_id", customerId);
    expect(voteError).toBeNull();
    expect(voteCount).toBe(1);

    await page.goto("/fr/menu");
    await expect(page.getByRole("heading", { name: "Idées de plats des clients" })).toBeVisible();
    await expect(page.getByText(suggestionTitle, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Créer un brouillon" }).click();

    await expect(page.getByText(/Brouillon créé\. Complétez prix, allergènes et disponibilité/)).toBeVisible({ timeout: 30_000 });
    const { data: savedSuggestion, error: saveError } = await supabaseAdmin.from("meal_suggestions")
      .select("status, menu_item_id")
      .eq("id", suggestionId)
      .single();
    expect(saveError).toBeNull();
    expect(savedSuggestion?.status).toBe("draft_added");
    expect(savedSuggestion?.menu_item_id).toBeTruthy();
    draftItemId = savedSuggestion!.menu_item_id!;

    const { data: draft, error: draftError } = await supabaseAdmin.from("menu_items")
      .select("name, active, is_draft, allergens_confirmed")
      .eq("id", draftItemId)
      .single();
    expect(draftError).toBeNull();
    expect(draft).toMatchObject({ name: suggestionTitle, active: false, is_draft: true, allergens_confirmed: false });
  });
});
