import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import dotenv from "dotenv";

// Playwright always runs with cwd = project root, so a plain relative path
// works here — no need for import.meta.url (which the default CJS test
// transform doesn't support).
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour lancer les tests e2e (voir .env.local)."
  );
}

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
  for (let i = 0; i < attempts; i++) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (!error) return;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
  }
  // Best-effort: don't fail the test suite over leftover test data.
  console.warn(`cleanupTestUser: could not delete ${userId} after ${attempts} attempts.`);
}

/** Logs in through the real form and waits for the post-login redirect. */
export async function loginAs(page: Page, user: Pick<TestUser, "email" | "password">): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/overview/, { timeout: 15000 });
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

/** Deletes any restaurant left with zero members — the "phantom restaurant" shape. */
export async function cleanupOrphanRestaurants(): Promise<void> {
  const { data: restaurants } = await supabaseAdmin.from("restaurants").select("id, name").eq("name", "Mon restaurant");
  for (const r of restaurants ?? []) {
    const { count } = await supabaseAdmin
      .from("restaurant_members")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", r.id);
    if (count === 0) await supabaseAdmin.from("restaurants").delete().eq("id", r.id);
  }
}
