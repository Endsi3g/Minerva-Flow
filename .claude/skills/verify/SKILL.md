---
name: verify
description: Drive Flow par Minerva end-to-end in a real browser (Playwright) to confirm a change actually works, not just typechecks/builds.
---

# Verifying Flow par Minerva end-to-end

No Playwright MCP tool exists in this environment. Install it locally instead:

```bash
npm install -D playwright
npx playwright install chromium --with-deps
```

## Launch

```bash
npm run dev > /tmp/dev-server.log 2>&1 &
```

Dev server runs on **port 3200** (`next dev -p 3200`, see `package.json`), not 3000. Confirm it's up with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/` (expect 307, since `/` redirects based on auth state) before driving anything.

## Get an authenticated session

There's no seeded test user. Create one via the Supabase service-role client (bypasses email confirmation):

```js
import { createClient } from "@supabase/supabase-js";
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
```

This fires `handle_new_user()`, which creates a default "Mon restaurant" + owner membership — enough to test most owner-gated flows immediately.

Log in through the real form at `/login` (email/password inputs, no special selectors needed) — `page.waitForURL(/overview/)` after submit works fine for *this* redirect specifically.

## The onboarding wizard will intercept every fresh user

A brand-new user is redirected into a 3-step onboarding wizard before reaching any other page (even direct `page.goto()` to another route bounces back to `/onboarding`). It must be completed once per user:

1. **Step 1** ("Bienvenue") has an *inner* feature carousel (Vue d'ensemble / Chat IA / Rapports) that the "Suivant" button advances through *before* moving to outer step 2 — expect to click "Suivant" **3 times**, not once, to clear step 1. Poll for the step-2 name input instead of counting clicks:
   ```js
   const nameInput = page.locator('input[placeholder="Alex Tremblay"]');
   for (let i = 0; i < 6 && !(await nameInput.isVisible().catch(() => false)); i++) {
     await page.getByRole("button", { name: /suivant/i }).click();
     await page.waitForTimeout(300);
   }
   ```
2. **Step 2** ("Faites connaissance") requires the name field filled — `canGoNext` blocks empty. Fill it, then "Suivant".
3. **Step 3** ("Vous êtes prêt !") — the button reads **"Commencer"**, not "Terminer"/"Suivant". Clicking it calls three sequential server actions (`setMyRoleAction`, `updateProfileNameAction`, `finishOnboardingAction`) then `router.push("/overview")`.

**Known flake**: `page.waitForURL(/overview/)` after clicking "Commencer" times out even though the server logs show all three actions succeeding and `/overview` being served 200 — almost certainly `ServiceWorkerManager`'s service worker interfering with Playwright's `load`-event detection. Don't fight it: `await page.waitForTimeout(4000)` then proceed (or `page.goto()` your actual target route directly instead of waiting on the client-side redirect).

## Silently-swallowed errors are common in this codebase

Several `lib/data/*.ts` functions do `if (error || !data) return null;` with no logging — a real DB failure surfaces to the user only as a generic toast ("L'ajout du X a échoué") with zero trace in server logs. If a flow fails with no server-log explanation, **temporarily add `console.error(error)`** in the relevant data-layer function, reproduce, read `/tmp/dev-server.log` (Next.js prints server-action console output inline under the request line), then decide whether to keep the logging or revert.

## Checking migration state directly

Don't assume a migration applied cleanly just because it's in `supabase/migrations/`. Query PostgREST directly with the service-role client — `select("<column>")` on the suspect table; `column X does not exist` (or PGRST204 "not found in schema cache") means it's genuinely missing in production, not a code bug:

```js
const { error } = await supabase.from("menu_items").select("image_url").limit(1);
```

This caught a real gap: the last ~170 lines of `0010_pending_lots_and_phases.sql` (menu_items.image_url, restaurants.tax_rate/accepts_tips, the entire orders/order_items/menu_shares tables) were never applied to production even though the rest of that same migration file was — worth re-checking after any "did the migration actually run" question, not just the newest migration.

## Cleanup

Kill the dev server (`pkill -f "next dev -p 3200"` or track the PID), and delete any scratch verification scripts/test users — they aren't meant to be committed or to accumulate in Supabase auth.
