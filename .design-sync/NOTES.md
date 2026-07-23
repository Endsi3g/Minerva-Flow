# Flow by Minerva — design-sync notes

Repo-specific quirks and decisions from the first sync, for future re-syncs.

## Source shape

This repo is a Next.js **application**, not a published component-library package. There is no `dist/` build and `minerva-flow` is never installed into its own `node_modules` (npm won't self-install a package into itself). The build works around this with:

- A self-referential symlink `node_modules/minerva-flow -> ..` (repo root) so the converter's `PKG_DIR` resolution finds a real `package.json`. **Recreate this on a fresh clone**: `ln -sfn .. node_modules/minerva-flow`.
- `cfg.srcDir: "components/ui"` — the synced design system is scoped to `components/ui/` (+ `components/theme/ThemeProvider.tsx` via `extraEntries`) only. The rest of `components/` (auth, campaigns, chat, menu, onboarding, settings, shell, etc.) is app-specific composition, not design-system surface, and was deliberately excluded.
- No real build script → synth-entry mode (`[NO_DIST]`, expected every build). `.d.ts` prop contracts are therefore weaker than a real build would produce (many stub to `[key: string]: unknown` — see `dtsPropsFor` below).

## `next/link` shim

`components/ui/Button.tsx` imports `next/link` directly. The real Next.js Link module pulls in App Router internals (`process.env.__NEXT_*` checks, router context) that don't exist in a standalone browser bundle — this broke *every* component at bundle-load time (`ReferenceError: process is not defined`), not just Button, since the synth entry re-exports every src file into one bundle.

Fixed via `cfg.tsconfig: ".design-sync/tsconfig.dssync.json"` — a local, tool-only tsconfig (never touches the real `tsconfig.json`) with a `paths` entry mapping `next/link` → `.design-sync/shims/next-link.tsx` (a plain `<a>` wrapper). esbuild's tsconfig-paths plugin resolves any bare specifier listed in `paths`, not just `@/*`. If another core component starts importing `next/navigation`, `next/image`, etc., the same technique applies — add another `paths` entry and a shim file.

## Tailwind v4 CSS

`app/globals.css` uses Tailwind v4's CSS-first config (`@import "tailwindcss"` etc.) — these are unresolved npm-package `@import`s until run through the real PostCSS pipeline; copying the source file as-is ships literally zero utility classes (`[CSS_IMPORT_MISSING]` x3).

Fixed via `.design-sync/compile-css.mjs` — a one-off script that runs `app/globals.css` through the repo's real `@tailwindcss/postcss` plugin and writes the compiled output to `.design-sync/.cache/compiled-tailwind.css`, which `cfg.cssEntry` points at. **Must be re-run (`node .design-sync/compile-css.mjs`) before every `package-build.mjs`** — Tailwind v4 scans the live source tree for class usage, so any new component or new preview `.tsx` using classes not seen elsewhere in the repo needs a fresh compile to pick them up. (Confirmed during batch-3 preview authoring: a couple of arbitrary Tailwind classes used only inside `.design-sync/previews/*.tsx` silently compiled to nothing because the scan predated those files — recompiling after all previews are written is what makes them show up. Prefer reusing classes already used elsewhere in the real app source, or inline `style=` for anything truly new, since a preview-only class is only picked up on the *next* recompile, not the one that ran while you were writing it.)

## Brand fonts (next/font/google)

The app self-hosts 4 Google Fonts via `next/font/google` in `app/[locale]/layout.tsx` (Playfair Display → `--font-heading`, Plus Jakarta Sans → `--font-jakarta`, Inter → `--font-sans`, Fraunces → `--font-fraunces`). `app/globals.css` only declares these as passthroughs (`--font-heading: var(--font-heading)`) — the real value is injected at runtime by `next/font`'s generated className, which a standalone bundle has no equivalent for. Left as-is, `--font-heading` etc. are guaranteed-invalid and every component renders in the browser's fallback serif.

Fixed by sourcing the real font files directly from Google Fonts (same OFL-licensed families next/font itself downloads) via `.design-sync/fetch-fonts.mjs` → `.design-sync/fonts/fonts.css` (wired via `cfg.extraFonts`), **plus** appending a real `:root { --font-heading: 'Playfair Display', serif; ... }` override block at the end of `.design-sync/compile-css.mjs`'s output (NOT in `fonts.css` — the build only extracts `@font-face` rules from `cfg.extraFonts` CSS and silently strips everything else, including a `:root` block).

**Cascade-layer gotcha**: Tailwind v4 wraps its own token declarations in `@layer theme`. Per the CSS cascade-layers spec, *unlayered* normal declarations always beat *layered* ones regardless of source order — so the override block must stay **unlayered** (no `@layer` wrapper) and must NOT use `!important` (that flips the priority rule and makes the layered — broken — declaration win instead). Verified by checking `getComputedStyle(document.body).fontFamily` in a real headless render, not just by grepping for the property name in the shipped CSS (the `[TOKENS_MISSING]` check is a naive text-presence scan, not a cascade simulation — it will report a token as "defined" even when a losing declaration is shadowing it).

## Component discovery

- Synth-entry mode (no `.d.ts`) discovers components by scanning every `.tsx`/`.jsx` file directly under `components/ui/` for exported PascalCase value declarations — this naturally picks up compound sub-parts (`DialogContent`, `TableCell`, etc.), landing at 256 total components from 51 source files.
- `componentSrcMap: {"MarkerContent": null}` — `marker.tsx` and `map.tsx` both export a distinct `MarkerContent`. ESM `export *` treats a name re-exported by two different modules as ambiguous and silently drops it from the bundle (`[BUNDLE_EXPORT]`), so it can never be a synced component under either identity. Excluded rather than renamed (renaming would mean forking source).
- All 256 components land under a single `general` group since `components/ui/` is flat (no subdirectories) and the group-derivation heuristic falls back to `'general'` with no subfolder to name a category from. Cosmetic — everything renders and functions correctly, just not sub-categorized in the Design System pane. A future improvement: set per-component `docsMap` stubs with `category:` frontmatter, or split `components/ui/` into subfolders upstream, to get real grouping.

## Scope of this first sync

Per user choice: **`components/ui/` only** (not the rest of `components/`), and **"core components only"** for authored-preview investment — not all 256. Authored (all graded "good"):

- **Solo (orchestrator)**: Button, Card family (CardHeader/Title/Description/Action/Content/Footer), Table family (TableHeader/Body/Footer/Row/Head/Cell/Caption)
- **Batch 1 — forms**: Input, Textarea, Checkbox, Switch, Toggle, Badge, Label, Separator
- **Batch 2 — overlays**: Select (+ SelectGroup), Combobox, DropdownMenu, Popover, Tooltip, HoverCard, Command, Spinner
- **Batch 3 — dialogs**: Dialog (+ DialogFooter), AlertDialog (+ Footer/Header/Media), Sheet (+ Footer/Header), Drawer (+ Footer/Header), Accordion, Avatar, Tabs, Progress
- **Batch 4 — layout**: Skeleton, EmptyState, PageHeader, StatCard, Breadcrumb (+ Item/Separator/Ellipsis), Pagination (+ Item/Ellipsis), Field (+ Separator), InputGroup (+ Addon/Button/Input/Textarea)

Everything else (~180 components — chat/message/attachment/map/marker primitives, remaining compound sub-parts not individually listed above, brand icons) ships fully functional on the honest **floor card** (unauthored, not a failure) and is authorable incrementally on any future re-sync.

## Component-specific gotchas (from preview authoring)

- All interactive primitives are `@base-ui/react`, not native/Radix — controlled/uncontrolled props follow Base UI naming: `Checkbox`/`Switch` use `checked`/`defaultChecked`/`onCheckedChange`; `Toggle` uses `pressed`/`defaultPressed`/`onPressedChange` (not `checked`).
- `Badge`'s prop is `tone` (`green`/`lime`/`red`/`amber`/`neutral`/`ink`) + `dot?: boolean` — no `variant` prop, despite that being the more common shadcn convention.
- `Toggle`'s default variant is intentionally chromeless when unpressed (no border/background) — pair an unpressed + pressed toggle in the same story so the state contrast reads on a static screenshot; a lone unpressed default-variant toggle looks "unstyled" even though it's correct.
- `Label` has no own `disabled` prop — driven by `group-data-[disabled=true]` on an ancestor or `peer-disabled` paired with a native peer input.
- `DropdownMenuLabel` (Base UI `Menu.GroupLabel`) throws if used outside `DropdownMenuGroup` — always nest it inside a group, never as a bare sibling of `DropdownMenuItem`.
- `Select`'s `alignItemWithTrigger` (default `true`) can scroll a group's `SelectLabel` out of view when `defaultValue` isn't the first item — pass `alignItemWithTrigger={false}` on `SelectContent` for stories like that.
- Dialog/AlertDialog/Sheet/Drawer open-state stories use `defaultOpen modal={false}` on the root part (real usage pattern, confirmed against `components/ui/command.tsx` and `components/shell/MobileTabBar.tsx`).
- Avatar: arbitrary Tailwind hex classes (`bg-[#4A6FA5]`) silently compile to nothing in a story since Tailwind only sees classes present somewhere in real app source at compile time (see the Tailwind v4 CSS section above) — use inline `style={{ background }}` for one-off colors, matching `components/minerva/PersonAvatar.tsx`'s own pattern.
- `AccordionRoot`'s multi-open prop is `multiple`, not `openMultiple`.

## `dtsPropsFor` gap

Hand-written prop bodies (`cfg.dtsPropsFor`) exist for **Button** and the **Card**/**Table** families only (written by the orchestrator during the solo calibration pass). The other ~48 authored core components still carry the auto-extracted stub (`[key: string]: unknown`) as their shipped `.d.ts`, even though their previews were authored correctly from real source (not the stub). This doesn't affect preview fidelity, but it does mean the design agent's actual *prop-name contract* for those components is weak. Worth backfilling `dtsPropsFor` for the highest-traffic ones (Input, Select, Checkbox, Dialog, DropdownMenu at minimum) on a future sync.

## Re-sync risks

- **`.design-sync/.cache/compiled-tailwind.css` and `.design-sync/fonts/` are gitignored** (generated/fetched, not committed) — a fresh clone must re-run `node .design-sync/compile-css.mjs` and `node .design-sync/fetch-fonts.mjs` before the first build, or the CSS/font wiring silently reverts to broken (unresolved `@import`s, invalid `--font-*` vars).
- The `node_modules/minerva-flow` self-symlink is also not committed (lives under `node_modules/`, itself gitignored) — recreate on every fresh clone/CI run: `ln -sfn .. node_modules/minerva-flow`.
- The Tailwind recompile is content-scan-dependent: any new component or preview added later needs `compile-css.mjs` re-run before its classes will actually be in the shipped CSS — a stale compile is a silent, not loud, failure (classes just don't apply).
- ~180 non-core components remain on the floor card. If the user asks for broader preview coverage later, re-run this same batched-subagent pattern (see the 4-batch split above) scoped to the remaining component list.
