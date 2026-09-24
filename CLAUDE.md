@AGENTS.md

## Product update history

- `changelog_entries` is the shared, authenticated source of published product updates. Keep the web changelog and the native iOS “Mises à jour” screen reading from this source; do not create a separate native-only release history.
- When preparing a product release, update the web fallback/catalogue in `lib/data/changelog.ts` and publish the corresponding `changelog_entries` record through the existing release workflow/migration. Native screens with manually selectable language must honor `appLanguage` (French by default); use the shared `.strings` catalog for system-localized surfaces.
- Native changelog views must retain clear loading, empty, retryable error, and pull-to-refresh states, and use the semantic palette in `native/ios/MinervaFlow/Sources/Theme.swift` so light and dark appearances remain legible.
- Never claim a release is available until its changelog entry and the release state are verified against the exact build/deployment being described.
