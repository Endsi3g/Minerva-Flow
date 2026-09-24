import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import { e2eTestDatabase } from "./test-env";

const SUPABASE_URL = e2eTestDatabase.supabaseUrl;
const SERVICE_ROLE_KEY = e2eTestDatabase.serviceRoleKey;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL_PREFIX = "e2e-";
export const TEST_PASSWORD = "E2ePlaywright123!";

export type TestUser = { id: string; email: string; password: string };

/**
 * Creates a confirmed test user (skips email verification) with onboarding
 * already marked complete, so specs can go straight to the app instead of
 * threading through the 3-step wizard every time. Specs that specifically
 * test onboarding should NOT use this — sign up through the UI instead.
 */
export async function createTestUser(labelSuffix = ""): Promise<TestUser> {
  const email = `${TEST_EMAIL_PREFIX}${labelSuffix}${labelSuffix ? "-" : ""}${Date.now()}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createTestUser failed: ${error?.message}`);

  await supabaseAdmin.from("profiles").update({ onboarding_completed: true }).eq("id", data.user.id);

  return { id: data.user.id, email, password: TEST_PASSWORD };
}

/**
 * Deletes a test user (and, transitively via FK cascade, their
 * restaurant_members rows). `auth.admin.deleteUser` has been observed to
 * 500 transiently on this project — retry with backoff instead of failing
 * the whole test run over cleanup.
 */
export async function cleanupTestUser(userId: string, attempts = 3): Promise<void> {
  // Capture only restaurants this synthetic account was actually a member of.
  // A global name-based sweep can otherwise delete unrelated staging data.
  const { data: memberships, error: membershipLookupError } = await supabaseAdmin
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", userId);
  const restaurantIds = membershipLookupError
    ? []
    : [...new Set((memberships ?? []).map((membership) => membership.restaurant_id).filter(Boolean))];

  for (let i = 0; i < attempts; i++) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (!error) {
      await cleanupOrphanRestaurants(restaurantIds);
      return;
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  // Best-effort: don't fail the test suite over leftover test data.
  console.warn(`cleanupTestUser: could not delete ${userId} after ${attempts} attempts.`);
}

/**
 * Logs in through the real form and waits for the post-login redirect.
 * AuthCard's inputs are React-controlled — a fill() that lands before the
 * client bundle hydrates gets silently reset back to "" once React attaches
 * (see onboarding.spec.ts for the full explanation). Re-checking and
 * re-filling right before submit is a race-proof guard regardless of
 * exactly when hydration finishes.
 */
export async function loginAs(page: Page, user: Pick<TestUser, "email" | "password">): Promise<void> {
  await page.goto("/login");
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  await emailInput.fill(user.email);
  await passwordInput.fill(user.password);
  await page.waitForTimeout(300);
  if ((await emailInput.inputValue()) !== user.email) await emailInput.fill(user.email);
  if ((await passwordInput.inputValue()) !== user.password) await passwordInput.fill(user.password);
  await page.click('button[type="submit"]');
  // Next.js client navigation can stall while the overview's RSC request is
  // loading (notably when the staging database is slow). First wait for the
  // app's redirect; if it stalls, only recover when the real login form has
  // already written a Supabase auth cookie, then request the protected route
  // directly. This does not manufacture or inject a session.
  try {
    await page.waitForURL(/\/(?:overview|workspace)(?:[?#]|$)/, { timeout: 12000, waitUntil: "commit" });
  } catch (navigationError) {
    const hasSupabaseSession = (await page.context().cookies()).some((cookie) =>
      /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name) && cookie.value.length > 0
    );
    if (!hasSupabaseSession) throw navigationError;
    await page.goto("/workspace", { waitUntil: "commit", timeout: 30000 });
  }
  // The primary sidebar route is role/locale dependent (Aperçu, Overview,
  // or collapsed navigation), so it is not a stable proof of authentication.
  // The signed-in account control is present across owner/staff app shells.
  await expect(page.getByRole("button", { name: user.email })).toBeVisible({ timeout: 20_000 });
}

/**
 * A persistent, real (non-throwaway) test account, for smoke-testing login
 * against an account that went through actual signup rather than the
 * admin-API shortcut createTestUser() uses. Read from env, never hardcoded
 * here — see .env.local.
 */
export function getFixedTestUser(): Pick<TestUser, "email" | "password"> {
  const email = process.env.E2E_FIXED_TEST_EMAIL;
  const password = process.env.E2E_FIXED_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("E2E_FIXED_TEST_EMAIL et E2E_FIXED_TEST_PASSWORD sont requis (voir .env.local).");
  }
  return { email, password };
}

/** Deletes only known test-owned restaurants left behind after their last test member is removed. */
export async function cleanupOrphanRestaurants(knownRestaurantIds: string[] = []): Promise<void> {
  const restaurantIds = [...new Set(knownRestaurantIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (restaurantIds.length === 0) return;

  const { data: restaurants, error } = await supabaseAdmin.from("restaurants")
    .select("id, name")
    .in("id", restaurantIds)
    .eq("name", "Mon restaurant");
  if (error || !restaurants) return;
  for (const r of restaurants ?? []) {
    const { count } = await supabaseAdmin
      .from("restaurant_members")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", r.id);
    if (count === 0) await supabaseAdmin.from("restaurants").delete().eq("id", r.id);
  }
}
