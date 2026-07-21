import { test, expect } from "@playwright/test";
import { getFixedTestUser } from "./fixtures";

// Unlike the other specs (throwaway accounts created via the admin API),
// this logs in with a persistent account that actually went through real
// signup — a sanity check that the login form itself works end-to-end for
// an account shaped like a real user's, not just our synthetic fixtures.
test("logging in with a real account leaves the login page", async ({ page }) => {
  const user = getFixedTestUser();

  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Destination depends on this account's onboarding state (/overview vs
  // /onboarding), so just assert the login itself succeeded.
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 15000 });
});
