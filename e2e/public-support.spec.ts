import { expect, test } from "@playwright/test";

test.describe("public App Store support page", () => {
  test("French page stays public and shows the company contact details", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/fr/app-support");

    // French is the default locale, so next-intl canonicalizes it without /fr.
    await expect(page).toHaveURL(/\/app-support$/);
    await expect(page.getByRole("heading", { name: "Comment pouvons-nous vous aider ?" })).toBeVisible();
    await expect(page.getByText("support@minervaflow.app").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "(514) 451-5232" })).toHaveAttribute("href", "tel:+15144515232");
    await expect(page.getByText(/367 rue Lberge/)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("support-fr-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: test.info().outputPath("support-fr-mobile.png"), fullPage: true });
  });

  test("English page stays public and localized", async ({ page }) => {
    await page.goto("/en/app-support");

    await expect(page).toHaveURL(/\/en\/app-support$/);
    await expect(page.getByRole("heading", { name: "How can we help?" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Email support" })).toHaveAttribute("href", "mailto:support@minervaflow.app");
    await expect(page.getByText("Minerva Technologies Inc. · 367 rue Lberge")).toBeVisible();
  });
});
