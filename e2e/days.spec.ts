import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, type TestUser } from "./fixtures";

test.describe("Service days", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("days");
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("creating a day and clicking its row opens the detail page", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/days");

    await page.getByRole("button", { name: /ajouter une journée/i }).first().click();
    await page.locator('input[type="date"]').fill("2026-01-15");
    await page.locator('input[type="number"]').first().fill("1234.56");
    await page.getByRole("button", { name: /enregistrer la journée/i }).click();
    await page.waitForTimeout(1000);

    await page.getByText(/15 janvier/i).first().click();
    await expect(page).toHaveURL(/\/days\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(page.getByText("1 234,56").or(page.getByText("1234,56")).first()).toBeVisible();
  });
});
