---
name: verify
description: Deeply verify Minerva Flow changes across code, the newest git/deployment state, the current authenticated session, Playwright user journeys, and visual UI/UX quality.
---

# Minerva Flow deep verification

Use this skill when a feature, deployment, or recent push must be proven usable—not merely compiled. The result is an evidence-based report with pass/fail/blocked status, URLs, commit/deployment identifiers, test output, and screenshots/traces for important screens.

## Safety and scope

- Verification is read-only against git, the local app, configured preview deployments, and the test database. Do not push, deploy, mutate production data, or change external integrations.
- Never call a flow “clear” when a critical path is untested or blocked. Distinguish `PASS`, `FAIL`, and `BLOCKED`.
- Preserve the repository’s existing user changes. Create temporary users/data with a unique `verify-<timestamp>` marker and clean them up when safe.
- Do not expose secrets, tokens, service-role keys, or customer data in the report or screenshots.
- Follow the project’s Next.js 16 guidance and brand naming rules.

## Evidence run

Create an ignored run directory such as `.verify-artifacts/<UTC-timestamp>/` and save:

- `context.txt`: branch, working-tree state, latest commit, remote, and deployment URL/commit if available;
- `code.txt`: typecheck, tests, lint/build results and notable warnings;
- `journeys.txt`: each browser journey and its result;
- `screens/`: full-page screenshots for desktop and mobile breakpoints;
- `traces/`: Playwright traces/videos only for failures or visually important flows;
- `report.md`: final evidence matrix and remaining risks.

Do not commit the run directory. If the repository does not ignore it, use a temporary directory outside the repository instead.

## 1. Establish exactly what is being verified

Run read-only checks first:

```bash
git status --short
git branch --show-current
git log -1 --decorate --stat
git log -5 --oneline --decorate
git remote -v
```

Identify the newest local commit and, when configured, the newest remote/preview deployment. For Vercel projects use `vercel inspect <deployment-url-or-id>` or `vercel ls --yes`; never infer deployment state from git alone. Record whether the deployment corresponds to the commit under test. If credentials or a deployment URL are unavailable, mark deployment verification `BLOCKED`, not passed.

Read the changed files and their callers. Check route boundaries, server/client boundaries, authorization, validation, loading/error/empty states, persistence/migrations, and responsive behavior. Trace the primary user action from UI to action/API to data layer and back to the rendered state. Look for silent error swallowing, stale cache/revalidation, duplicate submits, unsafe redirects, missing permissions, and migrations that are present in git but absent from the database schema.

For schema changes, query the configured Supabase/PostgREST database with a service-role client only from a temporary script and only for column/table existence. Never print credentials or customer rows. A missing column/schema cache entry is a release blocker.

## 2. Static and automated quality gates

Run the smallest relevant checks, then the complete suite when time permits:

```bash
npx tsc --noEmit
npm test -- --run
npm run lint
npm run build
```

Run focused tests for changed modules before the complete suite. Report existing baseline failures separately from regressions; do not hide them by changing test configuration. For iOS/Android work, run the project’s compliance audit before submission and report missing tooling or critical findings explicitly.

## 3. Start and identify the app under test

For local verification:

```bash
npm run dev > /tmp/minerva-flow-verify.log 2>&1 &
curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/
```

The expected root response is normally `307`. Reuse an already running server only after confirming its URL, PID, and that it reflects the commit being tested. For a preview/deployment, run the same journeys against the exact URL and record it separately from local results.

## 4. Authenticate the current session safely

Prefer the user’s existing Playwright storage state/session when supplied. Otherwise create a temporary Supabase-confirmed test user using the service-role key from `.env.local`, log in through the real `/login` form, and complete onboarding through the UI. Do not bypass authorization by injecting cookies unless the session was created by the application or an approved test fixture.

Fresh users may hit the onboarding carousel: advance until the name field appears, fill the name, then use the final `Commencer` action. Do not rely solely on `waitForURL` after onboarding; wait for the resulting page or navigate directly after confirming the server actions succeeded.

## 5. Playwright functional journeys

Run the repository’s existing e2e tests first. Add a temporary spec when the changed behavior lacks coverage. Every journey must assert both the user-visible result and the persistence/API side effect where applicable.

At minimum, cover the relevant flows below:

- sign-in, onboarding, role-gated navigation, logout/session expiry;
- Overview and primary dashboard loading, empty, error, and refresh states;
- Menu/public share, public ordering, validation, payment handoff, and mobile viewport;
- Commandes: create/update/status transitions, duplicate-submit protection, delivery/address/fee/ETA when enabled;
- Jours: create or open a day and verify navigation to the dedicated detail page;
- Paramètres and Intégrations: tab selection, loading shimmers, cards, save/error feedback, and equivalent integration views;
- alert rules, loyalty/fidelisation, referrals, billing, collaborators, inventory, and any route touched by the latest change;
- responsive navigation/sidebar and keyboard focus for important controls.

Use stable semantic locators (`getByRole`, labels, test ids) and wait for observable UI state, not arbitrary sleeps. Capture a trace on failure (`trace: 'retain-on-failure'`) and attach the server log excerpt that explains it.

## 6. Visual and UX review

For each important route, capture desktop (1440×900) and mobile (390×844) screenshots after the page is settled. Inspect the rendered page, not only the DOM:

- alignment, hierarchy, typography, spacing, contrast, and brand consistency;
- sidebar/group behavior and active state;
- loading shimmer, empty, error, success, and disabled states;
- clipped text, overflow, broken icons/images, layout shifts, and sticky/fixed elements;
- touch target size, focus visibility, keyboard order, dialog escape behavior, and reduced-motion concerns;
- whether the next action is obvious and whether destructive/payment actions are understandable.

If a visual issue is found, include the screenshot path, route, viewport, severity, and a concise reproduction. A visual pass requires screenshots at both breakpoints; a DOM assertion alone is insufficient.

## 7. Latest deployment and current-session proof

Run the same smoke journey against the newest preview/production deployment when access exists. Compare:

| Target | Commit/deployment | Auth session | Functional result | Visual result |
|---|---|---|---|---|
| local | … | … | PASS/FAIL/BLOCKED | PASS/FAIL/BLOCKED |
| newest deployment | … | … | PASS/FAIL/BLOCKED | PASS/FAIL/BLOCKED |

If the current user session is already open in a browser, verify that session explicitly (current route, role, locale, responsive viewport, and one end-to-end action). Never claim a deployment is verified from local tests alone.

## 8. Final report

End with:

1. exact commit and deployment identifiers;
2. commands and test counts;
3. route/journey matrix with evidence links;
4. screenshots/traces for visual proof and failures;
5. regressions versus baseline;
6. blockers (credentials, unavailable deployment, missing migration, compliance audit, or flaky environment);
7. a release recommendation: `READY`, `READY WITH CONDITIONS`, or `NOT READY`.

“READY” is allowed only when changed critical flows pass locally and on the newest deployment, visual checks pass on desktop and mobile, and no critical blocker remains.

## Existing repository notes

- Next.js dev server uses port `3200`.
- Playwright and Vitest are already dependencies; do not reinstall them unless missing.
- Service-worker navigation can make client-side URL waits flaky. Assert rendered content/server responses and use a bounded fallback, documenting it.
- Read [references/report-template.md](references/report-template.md) before writing the final report.
