@AGENTS.md

## Product update history

- `changelog_entries` is the shared, authenticated source of published product updates. Keep the web changelog and the native iOS “Mises à jour” screen reading from this source; do not create a separate native-only release history.
- When preparing a product release, update the web fallback/catalogue in `lib/data/changelog.ts` and publish the corresponding `changelog_entries` record through the existing release workflow/migration. Native screens with manually selectable language must honor `appLanguage` (French by default); use the shared `.strings` catalog for system-localized surfaces.
- Native changelog views must retain clear loading, empty, retryable error, and pull-to-refresh states, and use the semantic palette in `native/ios/MinervaFlow/Sources/Theme.swift` so light and dark appearances remain legible.
- Never claim a release is available until its changelog entry and the release state are verified against the exact build/deployment being described.

## Team portal, data and logging boundaries

- `/equipe` (web) and `TeamMainView` (iOS) serve employees (`profiles.is_team_member`) and active ambassadors (`flow_ambassadors.status='active'`). Ambassadors must never see revenue, MRR, churn, targets or the funnel: keep that gate in all three layers (page, data function, API route). Details: `docs/TEAM_PORTAL.md`.
- Funnel and MRR figures exclude `restaurants.is_demo`. Flag seed, test and founder-owned restaurants there; never flag real sign-ups.
- Migrations live in `supabase/migrations` with one unique `NNNN_` number each; read `supabase/migrations/README.md` first (known duplicate `0102`, unapplied `0167_blog_posts`). Do not run `supabase db push --linked` blindly: it applies every pending file.
- Native diagnostics go through `AppLog.failure(_:_:)` (os.Logger, private payload), never `print`. Server code must not log customer emails or tokens.
- Native payments and payouts are not handled in-app: online checkout and ambassador payouts open the web app. Do not add a payment SDK or the word “Stripe” to native sources (App Store review heuristics, 3.1.1).
- Native NFC needs the App ID capability and regenerated manual-signing profiles before archive: see `docs/NFC_AND_SIGNING.md`.
