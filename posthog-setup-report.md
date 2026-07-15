# PostHog post-wizard report

The wizard has completed a full PostHog integration for **Minerva Flow** (Next.js 16.2.10, App Router). PostHog is initialized client-side via `instrumentation-client.ts` alongside the existing Sentry setup. A reverse-proxy through `/ingest` routes all PostHog traffic to avoid ad-blockers. A singleton `lib/posthog-server.ts` provides server-side event capture in Server Actions and API routes. Users are identified on login, signup, and on every authenticated page load via a `PostHogIdentifier` client component mounted in both app layouts.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `user_signed_up` | Fired when a user successfully creates a new account via email or OAuth. | `app/sign-up/page.tsx` |
| `user_logged_in` | Fired when a user successfully authenticates via email or OAuth. | `app/login/page.tsx` |
| `onboarding_completed` | Fired when a user finishes the onboarding wizard and their profile is marked complete. | `app/onboarding/actions.ts` |
| `campaign_created` | Fired when a new marketing campaign is successfully created. | `app/(app)/campaigns/new/NewCampaignView.tsx` |
| `campaign_status_changed` | Fired when a campaign's status is updated (e.g., started or terminated). | `app/(app)/campaigns/CampaignsView.tsx` |
| `member_invited` | Fired when an owner or manager sends a team member invitation. | `components/forms/InviteMemberModal.tsx` |
| `member_role_changed` | Fired when a team member's role is updated. | `app/(app)/collaborateurs/CollaborateursView.tsx` |
| `member_removed` | Fired when a collaborator is removed from the restaurant team. | `app/(app)/collaborateurs/CollaborateursView.tsx` |
| `employee_created` | Fired when a new employee record is added to the system. | `app/(app)/employees/EmployeesView.tsx` |
| `employee_review_submitted` | Fired when a performance review is saved for an employee. | `app/(app)/employees/EmployeesView.tsx` |
| `ai_conversation_started` | Fired when the user initiates a new AI assistant conversation. | `app/(chat)/assistant/actions.ts` |
| `ai_review_generated` | Fired when an AI-powered revenue review is successfully generated. | `app/(app)/reports/ai-review/actions.ts` |
| `transactions_imported` | Fired when a CSV file of financial transactions is successfully imported. | `app/(app)/finance/FinanceView.tsx` |
| `restaurant_created` | Fired when a new restaurant is created in the workspace settings. | `app/(app)/settings/actions.ts` |

## Files created or modified

- **Created** `instrumentation-client.ts` — PostHog client-side init (appended to existing Sentry init)
- **Modified** `next.config.ts` — Added `/ingest` reverse-proxy rewrites for PostHog
- **Created** `lib/posthog-server.ts` — Singleton server-side PostHog client
- **Created** `components/PostHogIdentifier.tsx` — Client component that calls `posthog.identify()` on mount
- **Modified** `app/(app)/layout.tsx` — Mounts `PostHogIdentifier` for authenticated app routes
- **Modified** `app/(chat)/layout.tsx` — Mounts `PostHogIdentifier` for the AI chat routes
- **Modified** `app/login/page.tsx` — `user_logged_in` + `posthog.identify()` + error capture
- **Modified** `app/sign-up/page.tsx` — `user_signed_up` + `posthog.identify()` + error capture
- **Modified** `app/onboarding/actions.ts` — `onboarding_completed` (server-side)
- **Modified** `app/(app)/campaigns/new/NewCampaignView.tsx` — `campaign_created`
- **Modified** `app/(app)/campaigns/CampaignsView.tsx` — `campaign_status_changed`
- **Modified** `components/forms/InviteMemberModal.tsx` — `member_invited`
- **Modified** `app/(app)/collaborateurs/CollaborateursView.tsx` — `member_role_changed`, `member_removed`
- **Modified** `app/(app)/employees/EmployeesView.tsx` — `employee_created`, `employee_review_submitted`
- **Modified** `app/(app)/finance/FinanceView.tsx` — `transactions_imported`
- **Modified** `app/(app)/reports/ai-review/actions.ts` — `ai_review_generated` (server-side)
- **Modified** `app/(app)/settings/actions.ts` — `restaurant_created` (server-side)
- **Modified** `app/(chat)/assistant/actions.ts` — `ai_conversation_started` (server-side)

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/341127/dashboard/1850491)
- **Insight**: [User signups](https://us.posthog.com/project/341127/insights/vKAxYpBQ)
- **Insight**: [Signup to onboarding funnel](https://us.posthog.com/project/341127/insights/1an8d3lu)
- **Insight**: [Campaigns created](https://us.posthog.com/project/341127/insights/IcUYVEqL)
- **Insight**: [AI reviews generated](https://us.posthog.com/project/341127/insights/ZBDkXGHU)
- **Insight**: [Team member actions](https://us.posthog.com/project/341127/insights/bS81zUiX)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any team bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the `PostHogIdentifier` component handles this on every authenticated page load, but verify it fires before testing in production.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
