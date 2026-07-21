import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, type TestUser } from "./fixtures";

// Skipped entirely when the key isn't configured for this test run, rather
// than failing — matches how the app itself degrades (search UI hidden).
test.skip(!process.env.GOOGLE_PLACES_API_KEY, "GOOGLE_PLACES_API_KEY not set for this test run");

test.describe("Google Places import", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("places");
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("searching and selecting a real place fills the form and persists on save", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/etablissement");

    const searchInput = page.getByPlaceholder("Nom de l'établissement ou adresse");
    await searchInput.fill("Schwartz's Deli Montreal");

    const suggestion = page.getByText("Schwartz's Deli").first();
    await suggestion.waitFor({ state: "visible", timeout: 10000 });
    await suggestion.click();

    const addressInput = page.locator('input[name="address"]');
    await expect(addressInput).toHaveValue(/Saint-Laurent/, { timeout: 10000 });
    await expect(page.locator('input[name="phone"]')).not.toHaveValue("");

    await page.getByRole("button", { name: /^enregistrer$/i }).click();
    await page.waitForTimeout(1500);

    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page.locator('input[name="address"]')).toHaveValue(/Saint-Laurent/);
  });
});
