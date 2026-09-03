import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, loginAs, supabaseAdmin } from "./fixtures";

test.describe("Marketing Studio & Viral Story Stickers", () => {
  let user: { id: string; email: string; password: string };
  let restaurantId: string;
  let programId: string;

  test.beforeAll(async () => {
    user = await createTestUser("marketing-e2e");
    // Create a restaurant and member role
    const { data: rest, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .insert({ name: "Bistro E2E Studio", service_model: "table" })
      .select("id")
      .single();
    if (restErr || !rest) throw new Error("Failed to create test restaurant");
    restaurantId = rest.id;

    await supabaseAdmin.from("restaurant_members").insert({
      restaurant_id: restaurantId,
      user_id: user.id,
      role: "owner",
    });

    // Create a referral program for the restaurant
    const { data: prog, error: progErr } = await supabaseAdmin
      .from("referral_programs")
      .insert({
        restaurant_id: restaurantId,
        name: "Offre Bienvenue E2E",
        reward_description: "10 $ offerts",
        active: true,
      })
      .select("id")
      .single();
    if (progErr || !prog) throw new Error("Failed to create test referral program");
    programId = prog.id;
  });

  test.afterAll(async () => {
    if (restaurantId) {
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurantId);
    }
    if (user?.id) {
      await cleanupTestUser(user.id);
    }
  });

  test("interacts with Marketing Studio objectives, stickers, and copy buttons", async ({ page }) => {
    await loginAs(page, user);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");

    // Verify Studio is displayed
    await expect(page.getByRole("heading", { name: /Studio Marketing/i })).toBeVisible({ timeout: 10000 });

    // Verify all 5 objectives exist
    await expect(page.getByRole("button", { name: /Menu & Plats/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Parrainage & Invitation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Avis Google 5★/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Passeport VIP Club/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ambassadeur Vedette/i })).toBeVisible();

    // Click on "Parrainage & Invitation"
    await page.getByRole("button", { name: /Parrainage & Invitation/i }).click();

    // Sticker configuration card must be visible
    await expect(page.getByText("Sticker Story Instagram & Facebook")).toBeVisible();
    await expect(page.getByText("Lien de destination avec tag UTM")).toBeVisible();

    // The canvas should contain the Story sticker badge
    await expect(page.getByText("Toucher le sticker")).toBeVisible();

    // Verify the copy button for Story Sticker is visible and clickable
    const copyStickerBtn = page.getByRole("button", { name: /Copier le lien pour Sticker Story/i });
    await expect(copyStickerBtn).toBeVisible();
    await copyStickerBtn.click();

    // Toast feedback check
    await expect(page.getByText("Lien de sticker Story copié !")).toBeVisible({ timeout: 5000 });

    // Switch to "Avis Google 5★"
    await page.getByRole("button", { name: /Avis Google 5★/i }).click();
    await expect(page.getByText("Avis Google Vérifié 5★", { exact: true })).toBeVisible();

    // Switch to "Passeport VIP Club"
    await page.getByRole("button", { name: /Passeport VIP Club/i }).click();
    await expect(page.getByText("Cercle Privilège Exclusif", { exact: true })).toBeVisible();

    // Switch to "Ambassadeur Vedette"
    await page.getByRole("button", { name: /Ambassadeur Vedette/i }).click();
    await expect(page.getByText("Ambassadeur Vedette du Mois", { exact: true })).toBeVisible();

    // Switch back to "Menu & Plats"
    await page.getByRole("button", { name: /Menu & Plats/i }).click();
    await expect(page.getByText("Plat #1")).toBeVisible();
  });

  test("public referral landing page /p/[code] displays Minerva Flow branding, gift offer, and reservation flow", async ({ page }) => {
    // Create a customer and a referral link
    const { data: cust, error: custErr } = await supabaseAdmin
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        name: "Sophie Tremblay",
      })
      .select("id")
      .single();
    if (custErr || !cust) throw new Error("Failed to create customer: " + custErr?.message);

    const code = "E2E" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error: linkErr } = await supabaseAdmin
      .from("customer_referral_links")
      .insert({
        referral_program_id: programId,
        customer_id: cust.id,
        code,
        clicks: 0,
      });
    if (linkErr) throw new Error("Failed to create customer referral link: " + linkErr.message);

    // Visit the public referral landing page
    await page.goto(`/p/${code}`);
    await page.waitForLoadState("networkidle");

    // Brand check: Minerva Flow
    await expect(page.getByText("Minerva Flow", { exact: false }).first()).toBeVisible();

    // Invariance rule: Flow par Minerva MUST NOT exist
    const bodyText = await page.textContent("body");
    expect(bodyText?.toLowerCase()).not.toContain("flow par minerva");

    // Referrer and Restaurant presentation
    await expect(page.getByText("Sophie Tremblay vous invite chez")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bistro E2E Studio" })).toBeVisible();
    await expect(page.getByText("10 $ offerts")).toBeVisible();

    // CTA button: Réserver une table
    const reserveBtn = page.getByRole("button", { name: /Réserver une table/i });
    await expect(reserveBtn).toBeVisible();
    await reserveBtn.click();

    // Lands on /p/[code]/reserver
    await page.waitForURL(new RegExp(`/p/${code}/reserver`));
    await expect(page.getByText("Bistro E2E Studio")).toBeVisible();
  });
});
