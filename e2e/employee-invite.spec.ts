import { test, expect } from "@playwright/test";
import {
  createTestUser,
  cleanupTestUser,
  cleanupOrphanRestaurants,
  loginAs,
  supabaseAdmin,
  TEST_PASSWORD,
  type TestUser,
} from "./fixtures";

test.describe("Employee login access", () => {
  let owner: TestUser;
  let invitedUserId: string | undefined;

  test.beforeEach(async () => {
    owner = await createTestUser("employee-invite-owner");
  });

  test.afterEach(async () => {
    if (invitedUserId) await cleanupTestUser(invitedUserId);
    await cleanupTestUser(owner.id);
    await cleanupOrphanRestaurants();
    invitedUserId = undefined;
  });

  test("inviting an employee links their new account to the employee record", async ({ page }) => {
    const employeeEmail = `e2e-employee-${Date.now()}@example.com`;
    const employeeName = `E2E Employee ${Date.now()}`;

    await loginAs(page, owner);
    await page.goto("/employees");
    await page.getByRole("button", { name: /ajouter|nouvel|add/i }).first().click();
    await page.fill('input[name="fullName"]', employeeName);
    await page.fill('input[name="contactEmail"]', employeeEmail);
    await page.getByRole("button", { name: /ajouter|add/i }).last().click();
    await expect(page.getByText(employeeName).first()).toBeVisible({ timeout: 10000 });

    await page.getByText(employeeName).first().click();
    await page.getByRole("button", { name: /inviter à se connecter/i }).click();
    await page.getByRole("button", { name: /générer le lien/i }).click();

    // Text-content match on the URL itself rather than a CSS class — the
    // "truncate" class is a common Tailwind utility used elsewhere on the
    // page too (e.g. the account email in the header).
    const linkText = await page.getByText(/\/invite\//).innerText();
    const token = linkText.split("/invite/")[1];
    expect(token).toBeTruthy();

    // Redeem in a fresh browser context — the invited employee has no
    // existing session and creates their account from scratch.
    const invitedContext = await page.context().browser()!.newContext();
    const invitedPage = await invitedContext.newPage();
    await invitedPage.goto(`/invite/${token}`);
    await invitedPage.getByRole("link", { name: /créer un compte/i }).click();
    // AuthCard's inputs are React-controlled — see onboarding.spec.ts for why
    // a fill() that lands before hydration gets silently reset to "".
    const invitedEmailInput = invitedPage.locator('input[type="email"]');
    const invitedPasswordInputs = invitedPage.locator('input[type="password"]');
    await invitedEmailInput.fill(employeeEmail);
    await invitedPasswordInputs.nth(0).fill(TEST_PASSWORD);
    await invitedPasswordInputs.nth(1).fill(TEST_PASSWORD);
    await invitedPage.waitForTimeout(300);
    if ((await invitedEmailInput.inputValue()) !== employeeEmail) await invitedEmailInput.fill(employeeEmail);
    if ((await invitedPasswordInputs.nth(0).inputValue()) !== TEST_PASSWORD)
      await invitedPasswordInputs.nth(0).fill(TEST_PASSWORD);
    if ((await invitedPasswordInputs.nth(1).inputValue()) !== TEST_PASSWORD)
      await invitedPasswordInputs.nth(1).fill(TEST_PASSWORD);
    await invitedPage.click('button[type="submit"]');
    await invitedPage.waitForTimeout(3000);
    await invitedContext.close();

    const { data: employeeRow } = await supabaseAdmin
      .from("employees")
      .select("id, linked_user_id")
      .eq("contact_email", employeeEmail)
      .maybeSingle();

    expect(employeeRow?.linked_user_id).toBeTruthy();
    invitedUserId = employeeRow!.linked_user_id as string;
  });
});
