import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, type TestUser } from "./fixtures";

test.describe("Menu", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("menu");
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("adding a dish succeeds and shows up in the list with no error toast", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/menu");

    const itemName = `Item E2E ${Date.now()}`;
    await page.getByRole("button", { name: /ajouter|nouveau|add/i }).first().click();
    await page.fill('input[name="name"]', itemName);
    await page.fill('input[name="price"]', "12.50");
    await page.fill('input[name="foodCost"]', "4.25");
    await page.getByRole("button", { name: /créer|create|ajouter/i }).last().click();

    await expect(page.getByText(itemName)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
  });

  test("sharing the menu produces a public link", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/menu");

    await page.getByRole("button", { name: /ajouter|nouveau|add/i }).first().click();
    await page.fill('input[name="name"]', `Item Share ${Date.now()}`);
    await page.fill('input[name="price"]', "10");
    await page.fill('input[name="foodCost"]', "3");
    await page.getByRole("button", { name: /créer|create|ajouter/i }).last().click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /partager le menu/i }).click();
    await page.getByRole("button", { name: /créer|create|générer/i }).last().click();

    await expect(page.getByText(/\/m\//)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toHaveCount(0);
  });
});
