import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, cleanupOrphanRestaurants, loginAs, type TestUser } from "./fixtures";

// Every new signup gets a workspace automatically (handle_new_user() trigger,
// supabase/migrations/0011_workspaces.sql), so /collaborateurs — which now
// consolidates onto the workspace invite system (Phase 4) — should always
// have one to invite through.
test.describe("Collaborateurs", () => {
  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("collab");
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.id);
    await cleanupOrphanRestaurants();
  });

  test("generating an invite link produces a workspace invite URL", async ({ page }) => {
    await loginAs(page, user);
    await page.goto("/collaborateurs");

    await page.getByRole("button", { name: /inviter un collaborateur/i }).first().click();
    await page.getByRole("button", { name: /générer le lien/i }).click();

    // Text-content match on the URL itself rather than a CSS class — the
    // "truncate" class is a common Tailwind utility used elsewhere on the
    // page too (e.g. the account email in the header).
    await expect(page.getByText(/\/invite\/w\//)).toBeVisible({ timeout: 10000 });
  });
});
