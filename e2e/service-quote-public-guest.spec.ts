import { test, expect } from "@playwright/test";
import { randomInt } from "node:crypto";
import { supabaseAdmin } from "./fixtures";

test.describe("Public catering quote request without an account", () => {
  let workspaceId: string | null = null;
  let restaurantId: string | null = null;
  let menuShareId: string | null = null;
  let guestEmail = "";
  let rateLimitIp = "";

  test.beforeEach(async ({ page }) => {
    // The public endpoint correctly rate-limits each client IP. Give each
    // isolated E2E case an RFC 2544 benchmarking-range address so reruns do
    // not share the developer's local IP bucket or weaken the app's limiter.
    const address = randomInt(0, 1 << 17);
    rateLimitIp = `198.${18 + (address >> 16)}.${(address >> 8) & 255}.${address & 255}`;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": rateLimitIp });

    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    guestEmail = `e2e-public-quote-${nonce}@example.com`;

    const { data: workspace, error: workspaceError } = await supabaseAdmin.from("workspaces")
      .insert({ name: `E2E public quote ${nonce}` })
      .select("id")
      .single();
    if (workspaceError || !workspace) throw new Error(`Test workspace could not be created: ${workspaceError?.message}`);
    workspaceId = workspace.id;

    const { data: restaurant, error: restaurantError } = await supabaseAdmin.from("restaurants")
      .insert({ name: `E2E Public Quote ${nonce}`, workspace_id: workspaceId, delivery_enabled: true })
      .select("id")
      .single();
    if (restaurantError || !restaurant) throw new Error(`Test restaurant could not be created: ${restaurantError?.message}`);
    restaurantId = restaurant.id;

    const { data: share, error: shareError } = await supabaseAdmin.from("menu_shares")
      .insert({ restaurant_id: restaurantId, token: `e2e-public-${nonce}`, title: "E2E public quote" })
      .select("id")
      .single();
    if (shareError || !share) throw new Error(`Test menu share could not be created: ${shareError?.message}`);
    menuShareId = share.id;
  });

  test.afterEach(async () => {
    if (rateLimitIp) {
      const { error } = await supabaseAdmin.from("rate_limit_hits").delete()
        .eq("rate_key", `service-quote:${rateLimitIp}`);
      if (error) throw new Error(`Test rate-limit cleanup failed: ${error.message}`);
    }
    if (guestEmail && restaurantId) {
      const { error } = await supabaseAdmin.from("service_quotes").delete()
        .eq("restaurant_id", restaurantId).eq("guest_email", guestEmail);
      if (error) throw new Error(`Test quote cleanup failed: ${error.message}`);
    }
    if (menuShareId && restaurantId) {
      const { error } = await supabaseAdmin.from("menu_shares").delete()
        .eq("id", menuShareId).eq("restaurant_id", restaurantId);
      if (error) throw new Error(`Test menu share cleanup failed: ${error.message}`);
    }
    if (restaurantId) {
      const { error } = await supabaseAdmin.from("restaurants").delete().eq("id", restaurantId);
      if (error) throw new Error(`Test restaurant cleanup failed: ${error.message}`);
    }
    if (workspaceId) {
      const { error } = await supabaseAdmin.from("workspaces").delete().eq("id", workspaceId);
      if (error) throw new Error(`Test workspace cleanup failed: ${error.message}`);
    }
  });

  test("submits and persists a scheduled catering request from the public menu", async ({ page }, testInfo) => {
    if (!menuShareId || !restaurantId) throw new Error("Test menu was not provisioned.");
    const { data: share, error: shareError } = await supabaseAdmin.from("menu_shares")
      .select("token").eq("id", menuShareId).single();
    if (shareError || !share) throw new Error(`Test menu share could not be loaded: ${shareError?.message}`);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin.from("restaurants")
      .select("timezone").eq("id", restaurantId).single();
    if (restaurantError || !restaurant) throw new Error(`Test restaurant could not be loaded: ${restaurantError?.message}`);
    const eventAt = new Date(Date.now() + 48 * 60 * 60_000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: restaurant.timezone ?? "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(eventAt);
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
    const localEventTime = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;

    await page.goto(`/fr/m/${share.token}`);
    await page.getByRole("button", { name: /demander un devis sur mesure|request a custom quote/i }).click();
    await expect(page.locator('input[name="guestName"]')).toBeVisible();
    await page.locator('input[name="guestName"]').fill("E2E Public Guest");
    await page.locator('input[name="guestPhone"]').fill("+15145550129");
    await page.locator('input[name="guestEmail"]').fill(guestEmail);
    await page.locator('input[name="eventAtLocal"]').fill(localEventTime);
    await page.locator('input[name="guestCount"]').fill("24");
    await page.locator('textarea[name="description"]').fill("Buffet pour une réception de test, avec options végétariennes et allergènes indiqués.");
    await page.getByRole("button", { name: /envoyer la demande|send request/i }).click();

    await expect(page.getByText(/demande transmise|request sent/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("dialog").screenshot({ path: testInfo.outputPath("catering-success-dialog-desktop.png") });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("public-catering-confirmation-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("dialog").screenshot({ path: testInfo.outputPath("catering-success-dialog-mobile.png") });
    await page.screenshot({ path: testInfo.outputPath("public-catering-confirmation-mobile.png"), fullPage: true });
    const { data: quote, error: quoteError } = await supabaseAdmin.from("service_quotes")
      .select("restaurant_id, quote_type, status, guest_name, guest_count, event_at, fulfillment_mode, customer_id")
      .eq("restaurant_id", restaurantId).eq("guest_email", guestEmail).single();
    expect(quoteError).toBeNull();
    expect(quote).toMatchObject({
      restaurant_id: restaurantId,
      quote_type: "catering",
      status: "requested",
      guest_name: "E2E Public Guest",
      guest_count: 24,
      fulfillment_mode: "sur_place",
      customer_id: null,
    });
    expect(Date.parse(quote!.event_at)).toBeGreaterThan(Date.now() + 12 * 60 * 60_000);
  });

  test("requires and persists the delivery destination for a catering request", async ({ page }, testInfo) => {
    if (!menuShareId || !restaurantId) throw new Error("Test menu was not provisioned.");
    const { data: share, error: shareError } = await supabaseAdmin.from("menu_shares")
      .select("token").eq("id", menuShareId).single();
    if (shareError || !share) throw new Error(`Test menu share could not be loaded: ${shareError?.message}`);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin.from("restaurants")
      .select("timezone").eq("id", restaurantId).single();
    if (restaurantError || !restaurant) throw new Error(`Test restaurant could not be loaded: ${restaurantError?.message}`);
    const eventAt = new Date(Date.now() + 72 * 60 * 60_000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: restaurant.timezone ?? "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(eventAt);
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "00";
    const localEventTime = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
    const deliveryAddress = "1250 boulevard Saint-Laurent, Montréal, QC H2X 2S6";

    await page.goto(`/fr/m/${share.token}`);
    await page.getByRole("button", { name: /demander un devis sur mesure|request a custom quote/i }).click();
    await expect(page.locator('input[name="guestName"]')).toBeVisible();
    await page.locator('input[name="guestName"]').fill("E2E Delivery Guest");
    await page.locator('input[name="guestPhone"]').fill("+15145550128");
    await page.locator('input[name="guestEmail"]').fill(guestEmail);
    await page.locator('input[name="eventAtLocal"]').fill(localEventTime);
    await page.locator('input[name="guestCount"]').fill("16");
    await page.locator('textarea[name="description"]').fill("Service traiteur avec livraison et options végétariennes pour une réception de test.");
    await page.getByRole("button", { name: /^livraison$|^delivery$/i }).click();
    const addressInput = page.locator('input[name="deliveryAddress"]');
    await expect(addressInput).toBeVisible();
    await addressInput.fill(deliveryAddress);
    await addressInput.scrollIntoViewIfNeeded();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("public-catering-delivery-form-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("form").evaluate((form) => { form.scrollTop = 0; });
    await page.screenshot({ path: testInfo.outputPath("public-catering-delivery-form-mobile.png"), fullPage: true });
    await addressInput.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("public-catering-delivery-form-mobile-bottom.png"), fullPage: true });
    await page.getByRole("button", { name: /envoyer la demande|send request/i }).click();

    await expect(page.getByText(/demande transmise|request sent/i)).toBeVisible({ timeout: 15_000 });
    const { data: quote, error: quoteError } = await supabaseAdmin.from("service_quotes")
      .select("restaurant_id, quote_type, status, guest_count, event_at, fulfillment_mode, delivery_address, customer_id")
      .eq("restaurant_id", restaurantId).eq("guest_email", guestEmail).single();
    expect(quoteError).toBeNull();
    expect(quote).toMatchObject({
      restaurant_id: restaurantId,
      quote_type: "catering",
      status: "requested",
      guest_count: 16,
      fulfillment_mode: "livraison",
      delivery_address: "1250 boulevard Saint-Laurent, Montréal, QC H2X 2S6",
      customer_id: null,
    });
    expect(Date.parse(quote!.event_at)).toBeGreaterThan(Date.now() + 12 * 60 * 60_000);
  });
});
