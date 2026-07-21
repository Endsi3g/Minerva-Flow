import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, type TestUser } from "./fixtures";

// schwartzsdeli.com is a real, stable restaurant website with a reliable
// <meta name="description"> tag — used here as a live fixture rather than a
// mock, since fetchWebsiteDescription() (lib/website-description.ts) is a
// genuine network call, not pure logic.
const REAL_WEBSITE = "schwartzsdeli.com";

test.describe("Établissement", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("etablissement");
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("saving a website auto-fills the description field", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/etablissement");

    await page.fill('input[placeholder="Ex : minerva-restaurant.com"]', REAL_WEBSITE);
    await page.getByRole("button", { name: /^enregistrer$/i }).click();

    const description = page.locator("textarea");
    await expect(description).not.toHaveValue("", { timeout: 10000 });
    await expect(description).toHaveValue(/smoked meat/i);
  });
});
