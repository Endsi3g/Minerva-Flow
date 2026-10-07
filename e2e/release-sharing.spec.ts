import { test, expect } from "@playwright/test";
import { createTestUser, cleanupTestUser, loginAs, supabaseAdmin, type TestUser } from "./fixtures";

test.use({ locale: "fr-CA" });

test("owner and internal team can open results and export a real PNG", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  let owner: TestUser | undefined;
  let restaurantId: string | undefined;
  try {
    owner = await createTestUser("release-sharing");
    const { data: membership, error } = await supabaseAdmin.from("restaurant_members")
      .select("restaurant_id").eq("user_id", owner.id).single();
    expect(error).toBeNull();
    restaurantId = membership!.restaurant_id;
    const { error: seedError } = await supabaseAdmin.from("customers").insert({
      restaurant_id: restaurantId, name: "Exemple E2E", visit_count: 2,
    });
    expect(seedError).toBeNull();
    await loginAs(page, owner);
    await page.goto("/fr/campaigns/resultats");
    await expect(page.locator("canvas")).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /PNG/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    await download.saveAs(testInfo.outputPath("owner-results.png"));
    await page.screenshot({ path: testInfo.outputPath("owner-share-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("owner-share-mobile.png"), fullPage: true });

    const { error: teamError } = await supabaseAdmin.from("profiles")
      .update({ is_team_member: true }).eq("id", owner.id);
    expect(teamError).toBeNull();
    await page.context().clearCookies();
    await page.goto("/fr/equipe/connexion");
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill(owner.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/equipe$/, { timeout: 30_000 });
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/fr/equipe/partager");
    await expect(page.getByRole("heading", { name: "Partager nos résultats" })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("team-share-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const header = page.locator("header").first();
    const brandBounds = await header.getByRole("link", { name: /Minerva Flow/ }).boundingBox();
    const introBounds = await header.getByRole("button", { name: "Revoir l’intro" }).boundingBox();
    expect(brandBounds).not.toBeNull();
    expect(introBounds).not.toBeNull();
    expect(brandBounds!.x + brandBounds!.width).toBeLessThanOrEqual(introBounds!.x);
    const nav = page.getByRole("navigation", { name: "Espace équipe" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Partager", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({ path: testInfo.outputPath("team-share-mobile.png"), fullPage: true });
  } finally {
    if (restaurantId) await supabaseAdmin.from("customers").delete().eq("restaurant_id", restaurantId);
    if (owner) await cleanupTestUser(owner.id);
  }
});
