# Minerva Flow — UI/UX Replication Guide

**Purpose of this document.** This is a from-scratch specification of Minerva Flow's design
system and application shell: every color, font, spacing rule, layout region, navigation
structure, and reusable component pattern the product is built from. It is written so that an
AI model — or a new engineer — with no access to this repository could reconstruct a
pixel-faithful, behaviorally-faithful shell (sidebar, topbar, mobile nav, admin panel, page
scaffolding, component library) and then slot in any number of feature pages using the same
conventions. It intentionally documents the **system**, not every business page — once the
system below is implemented, every additional page is "pick a page pattern from §8, fill in the
domain data," which is how the ~100 routes in this app were actually built.

Everything in this document reflects the real, current state of the codebase (verified against
source, not idealized).

---

## 1. Product identity

- **Name:** Minerva Flow — "Minerva-Flow" in URLs/branding.
- **What it is:** A SaaS operations platform for independent restaurants (Québec / France
  market): finance & break-even tracking, orders, inventory, staff, reservations, loyalty,
  AI assistant, and — as of this module — a sales/prospecting tool for the agency's own team.
- **Tone:** Calm, editorial, "trustworthy infrastructure" — closer to Stripe/Linear than a
  typical loud SaaS dashboard. Cream/parchment background, deep green accent, a serif display
  face reserved for headings only, generous rounded corners, soft shadows, no gradients.
- **Primary locale:** French (Québec) — `fr` is the default, unprefixed locale. `tr` (Turkish)
  is the second supported locale, prefixed (`/tr/...`).

## 2. Tech stack (for context — do not deviate without reason)

- **Framework:** Next.js 16 (App Router, Turbopack, async `params`/`searchParams` everywhere).
- **UI:** React 19, Tailwind CSS v4 (CSS-first config via `@theme inline`, no `tailwind.config.js`),
  `@base-ui/react` as the unstyled primitive layer (Button, Switch, Accordion, Dialog, Popover,
  Dropdown, Drawer…), `class-variance-authority` for variant components, `lucide-react` for
  icons, `motion` (Framer Motion successor) for the handful of animated shell pieces (sidebar
  collapse, collapsible nav sections).
- **i18n:** `next-intl`, two locales (`fr` default/unprefixed, `tr` prefixed), message files at
  `messages/fr.json` and `messages/tr.json`, one flat nested JSON tree.
- **Backend:** Supabase (Postgres + Auth + Realtime), Row Level Security on every table, a
  service-role "admin client" reserved for server-only privileged operations (public form
  submits, rate limiting, RPCs).
- **Fonts:** loaded via `next/font/google` in the root layout, not `<link>` tags.
- **Charts:** Recharts. **Toasts:** `sonner`. **Maps:** MapLibre GL.

## 3. Design tokens

All tokens are CSS custom properties defined once in `app/globals.css`, mapped into Tailwind's
theme via `@theme inline`, and consumed as Tailwind utility classes with the `mv-` prefix
(`bg-mv-cream`, `text-mv-ink`, `border-mv-border`, etc.). **Never hardcode hex colors in
components** — always go through a token.

### 3.1 Color tokens — light (default)

```css
--mv-green:        #167f5b;   /* primary brand accent — buttons, active nav, links */
--mv-green-dark:   #0e5a40;   /* hover/darker accent, headings on green */
--mv-green-darker: #0a4531;
--mv-green-light:  #dcece3;
--mv-green-tint:   #eef5f0;   /* pale accent background (icon chips, badges) */

--mv-lime:         #dfff5f;   /* secondary accent — highlights, selection color */
--mv-lime-dark:    #6d7e1f;
--mv-lime-tint:    #f4ffdc;

--mv-cream:        #f5f1e6;   /* page background */
--mv-cream-soft:   #fbf9f3;   /* header/sidebar/subtle-surface background */
--mv-surface:      #fffefa;   /* card/input surface, nearest to white */

--mv-ink:          #1a1e16;   /* primary text */
--mv-ink-soft:     #565f52;   /* secondary text */
--mv-ink-faint:    #8d9488;   /* tertiary / labels / metadata */
--mv-ink-mute:     #b3b8a9;   /* placeholder-level, barely-there */

--mv-border:       #e6e0d0;   /* default border */
--mv-border-soft:  #eee9db;   /* hairline / row dividers */

--mv-red:          #b5473a;   /* destructive / negative */
--mv-red-bg:       #f8ece8;
--mv-amber:        #ab7d1f;   /* warning */
--mv-amber-bg:     #f6efd9;

/* Revenue-intensity heatmap (5-step sequential scale) */
--mv-heat-1: #ede7d6; --mv-heat-2: #c7e1d0; --mv-heat-3: #8fc7a9;
--mv-heat-4: #4da37e; --mv-heat-5: #167f5b;

--shadow-mv-sm: 0 1px 2px rgba(26, 30, 22, 0.05);
--shadow-mv-md: 0 2px 4px rgba(26, 30, 22, 0.04), 0 8px 20px rgba(26, 30, 22, 0.06);
--shadow-mv-lg: 0 8px 16px rgba(26, 30, 22, 0.06), 0 24px 48px rgba(26, 30, 22, 0.10);
```

### 3.2 Color tokens — dark mode

Dark mode is a first-class palette swap (`class="dark"` on `<html>`, driven by `next-themes`),
**not** an inverted-filter hack. The brand green shifts role (deeper-for-text-on-cream becomes
brighter-for-text-on-near-black) so contrast stays correct in both directions:

```css
.dark {
  --mv-green: #1c9a6f; --mv-green-dark: #4ade9b; --mv-green-darker: #0a4531;
  --mv-green-light: #16362a; --mv-green-tint: #12241c;
  --mv-lime: #dfff5f; --mv-lime-dark: #eaff8f; --mv-lime-tint: #2b3410;
  --mv-cream: #14170f; --mv-cream-soft: #1a1e14; --mv-surface: #1f2418;
  --mv-ink: #f3f2ea; --mv-ink-soft: #b9c0b0; --mv-ink-faint: #838a7a; --mv-ink-mute: #5b6252;
  --mv-border: #33392a; --mv-border-soft: #262b1d;
  --mv-red: #e07a6a; --mv-red-bg: #3a1f1c; --mv-amber: #d9ab52; --mv-amber-bg: #3a3018;
  /* shadows get darker/heavier, heatmap scale re-keyed the same way */
}
```

A parallel set of shadcn-style tokens (`--card`, `--popover`, `--primary`, `--muted`, `--border`,
`--ring`, `--sidebar*`, `--chart-1..5`, expressed in OKLCH) exists alongside the `mv-*` tokens for
the small number of imported shadcn/base-ui primitives that expect them. Application code should
still prefer the `mv-*` tokens; the OKLCH set is infrastructure, not something feature code reads
directly.

### 3.3 Radii

`--radius: 0.625rem` (10px) is the base; Tailwind's `rounded-md/lg/xl/2xl/3xl/4xl` scale is
derived from it via multiplication (`--radius-2xl: calc(var(--radius) * 1.8)`, etc.). In
practice: **cards and panels use `rounded-2xl`, inputs/buttons use `rounded-lg`, small chips use
`rounded-full`.**

## 4. Typography

Exactly three font families, each with one job. Do not introduce a fourth.

| Role | Family | CSS var | Usage |
|---|---|---|---|
| **Headings / display** | `"New York"` (Apple system serif) → falls back to **Playfair Display** (loaded via `next/font/google`, variable `--font-heading-fallback`) → `ui-serif, Georgia, serif` | `--font-display` / `--font-heading` / `--font-serif` (all three aliases point at the same stack) | Page titles, card titles, big stat numbers, the logo wordmark. Class: `font-display`. Weight is almost always `font-medium` (500), not bold. |
| **UI / body** | **Plus Jakarta Sans** (`next/font/google`, weights 400/500/600/700/800, variable `--font-sans`) | `--font-sans` | Everything else: paragraphs, labels, buttons, table cells, nav. This is the default `body` font — no class needed. |
| **Monospace** | **JetBrains Mono** (`next/font/google`, variable `--font-mono`) | `--font-mono` | Numeric/code contexts only (rare — e.g. tokens, IDs). |

Body sets `font-feature-settings: "ss01" 1, "cv05" 1` and `-webkit-font-smoothing: antialiased`.

**Type scale in practice** (Tailwind arbitrary sizes are used deliberately instead of the
default `text-sm/lg/xl` scale, so sizes read as a curated system, not defaults):

- Page `<h1>`: `font-display text-[22px]` to `text-[26px] tracking-tight font-medium text-mv-ink`
- Card title: `font-display text-[15px]`–`text-[17px] font-medium`
- Stat number: `font-display text-[28px] font-medium leading-none`
- Body / labels: `text-[13px]`–`text-[13.5px]`
- Secondary text: `text-[12px]`–`text-[12.5px] text-mv-ink-soft`
- Metadata / eyebrow / uppercase labels: `text-[10.5px]`–`text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint`

## 5. Global CSS conventions (`app/globals.css`)

- `* { border-color: var(--mv-border); }` — so any bare `border` utility picks up the right
  color without repeating it.
- Scrollbars are hidden everywhere (`scrollbar-width: none` + WebKit `::-webkit-scrollbar { display: none }`)
  while content stays scrollable — a deliberate "clean" look.
- `::selection { background: var(--mv-lime); color: var(--mv-ink); }` — brand-colored text
  selection.
- A small library of named keyframe utility classes used throughout instead of ad hoc
  animations:
  - `.mv-animate-in` — fade+slide-up entrance (`opacity 0→1`, `translateY(6px→0)`, 0.35s).
    Used on nearly every list/card that mounts client-side.
  - `.mv-skeleton` — shimmer loading state (`background: var(--mv-border-soft)` + sweeping
    gradient overlay).
  - `.mv-leaf-breathe` — slow scale/rotate breathing loop (brand mascot / empty-state icon).
  - `.mv-check-pop` — a checkmark "pop" entrance (spring-like scale overshoot) for success
    states (task done, step complete).
  - `.mv-scale-in` — quick scale+fade for popovers/modals appearing.
- `.no-print` marks chrome (sidebar, topbar, mobile tab bar) that must vanish under
  `@media print` — several pages offer a "Download as PDF" button that calls `window.print()`.

## 6. Application shell architecture

Layout nests as:

```
app/[locale]/layout.tsx            (root: fonts, <html>/<body>, ThemeProvider, NextIntlClientProvider,
                                     TooltipProvider, Toaster, ServiceWorkerManager, Vercel Analytics)
  → app/[locale]/(app)/layout.tsx  (auth/session fetch, redirect to /onboarding if incomplete,
                                     AppProvider context, AppShell)
    → AppShell                     (sidebar + topbar + main content region + mobile tab bar)
      → page.tsx                   (the actual route)
```

Routes outside the `(app)` group — `/login`, `/sign-up`, `/onboarding`, `/admin/*`, public
token pages (`/m/[token]`, `/p/[code]`, `/r/[token]`, `/demo/[slug]`, `/portal`) — render their
own minimal chrome and never get the sidebar/topbar.

### 6.1 Root layout (`app/[locale]/layout.tsx`)

- Loads the three Google fonts as CSS variables on `<html>` via `cn(jakarta.variable,
  playfairDisplay.variable, jetbrainsMono.variable, "font-sans")`.
- `<html lang={locale} suppressHydrationWarning>` — required because `next-themes` mutates the
  class on the client before hydration settles.
- `<body className="min-h-full bg-mv-cream text-mv-ink antialiased">`.
- Provider order: `ThemeProvider` → `NextIntlClientProvider` → `TooltipProvider` (150ms delay) →
  page content, with `Toaster`, `ServiceWorkerManager` (PWA), and Vercel `Analytics` as siblings.
- `generateStaticParams` returns both locales; `generateMetadata` builds full SEO/OG/Twitter
  metadata, JSON-LD `SoftwareApplication` structured data, and locale alternates.
- `viewport.themeColor` is `#f5f1e6` — i.e. the light `--mv-cream` value (browser chrome tinting
  matches the app background even before a theme is resolved).

### 6.2 App layout (`(app)/layout.tsx`)

Server component: fetches the session (`getAppSessionData()` → auth user, restaurant list, role,
sidebar permission overrides, initial restaurant id, onboarding-completed flag). Redirects to
`/onboarding` if incomplete. Wraps children in `AppProvider` (the `lib/app-context.tsx` React
context that exposes `role`, `restaurantId`/`setRestaurantId`, `restaurants[]`,
`sidebarCollapsed`/`setSidebarCollapsed`, `sidebarPermissions`, `authUser`) and `AppShell`.

### 6.3 AppShell (`components/shell/AppShell.tsx`)

```
<div className="flex h-screen w-full overflow-hidden bg-mv-cream">
  <AppSidebar />                     — hidden below md, .no-print
  <div className="flex min-w-0 flex-1 flex-col">
    <header h-16 border-b bg-mv-cream-soft>
      [collapse toggle + AppBreadcrumb]     <TopbarActions />
    </header>
    <main className="flex-1 overflow-y-auto px-6 pt-6 pb-[…] lg:px-8 lg:pt-7 lg:pb-7">
      <div className="mx-auto max-w-[1600px]">  (max-w-[1800px] when sidebar collapsed)
        <UpdateBanner />  (hidden on /changelog)
        <WorkspaceSetupBanner />  (hidden on /etablissement)
        <PageTransition>{children}</PageTransition>
      </div>
    </main>
  </div>
  <MobileTabBar />                    — .no-print, hidden ≥ md
</div>
```

Key rules:
- **Content max-width is capped and centered** (`max-w-[1600px]` / `[1800px]`) — the app never
  stretches full-bleed on ultra-wide monitors, except routes in a small `FULL_BLEED_ROUTES`
  allow-list (currently just `/maps`), which drop the padding/max-width and render edge to edge.
- Bottom padding on `<main>` always reserves space for the mobile tab bar
  (`pb-[calc(4rem+24px+env(safe-area-inset-bottom))] md:pb-6`), so content never hides behind it.
- `PageTransition` wraps every route's children for a subtle route-change animation (motion-based
  fade/slide) — implement this once, reuse everywhere, never per-page.

### 6.4 Sidebar (`components/shell/AppSidebar.tsx`) — desktop, ≥ md

Fixed width **256px**, animated open/close via `motion` spring (`stiffness: 300, damping: 30`).
Collapsing sets width to 0 (desktop) or translates off-canvas (mobile, with a backdrop overlay).
Background `bg-mv-cream-soft`, right border `border-mv-border`.

**Structure, top to bottom:**

1. **Header block** (h-12, border-b): `TeamSwitcher` (current restaurant favicon + name in a
   dropdown listing all restaurants the user belongs to, plus a "manage workspace" link) +
   a search icon button that opens `SearchDialog` (cmdk-style global search).
2. **Core nav** — always visible, no section label, exactly 6 items (per the product's fixed
   navigation contract):
   1. Overview → `/overview` (Home icon)
   2. Flow AI → `/assistant` (MessageSquare icon)
   3. Finance & Seuil → `/finance` (Wallet icon, owner/manager only)
   4. Commandes & Ventes → `/commandes` (ClipboardList icon)
   5. Collaborateurs & Équipe → `/collaborateurs` (Users icon)
   6. Inventaire & Stocks → `/inventaire` (PackageSearch icon, owner/manager only)
3. **Favorites** (collapsible, open by default, only rendered if non-empty) — user-toggleable
   star on hover of any nav row; favorited items surface here regardless of which group they
   came from. Session-only state (no persistence).
4. **Performance & Analyse** (collapsible, open by default) — Jours (`/days`), Rapports
   (`/reports`), Menu (`/menu`), Fidélisation (`/fidelisation`), Carte (`/maps`), Programmes
   (`/programs`), Bibliothèque (`/library`).
5. **Opérations** (collapsible, open only if the current route is inside it) — Horaire
   (`/horaire`), Fournisseurs (`/fournisseurs`, owner/manager), Réservations (`/reservations`),
   Mon espace (`/mon-espace`), Employés (`/employees`, owner/manager).
6. **Teams / Restaurants** — un-collapsible list of every restaurant the user belongs to (colored
   letter-avatar switcher) + "Tous les établissements" link (`/etablissement`).
7. **Bottom-pinned block** (border-t): "Paramètres et plus" collapsible section (Intégrations,
   Facturation [owner-only], Guide, Support, Changelog) → Paramètres link (owner/manager only) →
   `LocaleSwitcher`.

Every nav row: icon (16px, `strokeWidth={active ? 2.2 : 1.5}`, 60% opacity when inactive) + label,
`rounded-md px-2.5 py-1.5 text-[13px] font-medium`. **Active state:** solid brand-green pill
(`bg-mv-green text-mv-cream-soft font-semibold shadow-sm`), matched by `pathname.startsWith(href)`.
**Hover (inactive):** `hover:bg-mv-ink/[0.06] hover:text-mv-ink`.

Role gating: every nav item declares `roles: Role[]` (`Role = "owner" | "manager" | "staff" |
"consultant"`); a nav item is visible only if the current role is in that list **and** (if a
`sidebarPermissions` allow-list is set on the account) the item's key is in it.

### 6.5 Mobile tab bar (`components/shell/MobileTabBar.tsx`) — < md

Fixed bottom nav, 5 slots, `h-[calc(4rem+env(safe-area-inset-bottom))]`,
`bg-mv-cream-soft/95 backdrop-blur-sm`, border-top:

1. Accueil → `/overview` (LayoutGrid)
2. Chat → `/assistant` (Sparkles)
3. Données → `/data` (Database)
4. Rapports → `/reports` (FileBarChart2)
5. **Plus** → opens a swipeable bottom `Drawer` (`DrawerSwipeHandle`) containing a 4-column icon
   grid of every remaining route the user's role can see (Programmes, Jours, Employés, Carte,
   Finance, Dépenses, Réservations, Horaire, Mon espace, Fournisseurs, Collaborateurs, Profil,
   Paramètres, Facturation, Guide, Support, Changelog).

Active tab: icon + label turn `text-mv-green-dark`, `strokeWidth` bumps from 1.8 to 2.2.

### 6.6 Topbar (`components/shell/TopbarActions.tsx` + `AppBreadcrumb.tsx`)

Left side (desktop): sidebar-collapse toggle button (`PanelLeft` icon) + vertical divider +
`AppBreadcrumb` (Home-rooted trail built by splitting the pathname, translating each segment via
a `crumbTranslationKeys` lookup, with a special case for `/reports/[slug]` resolving the slug
against `reportDefs`). Right side: `GlobalSearchModal` trigger, `NotificationBell`
(Supabase-realtime-driven unread badge combining `notifications` + `alerts` tables, popover list,
browser desktop-notification integration), a vertical divider, `UserMenu` (avatar + name/role,
dropdown: account, referral, settings, logout).

## 7. Component library (`components/ui/*`, `components/minerva/*`)

Two layers:
- `components/ui/*` — thin wrappers around `@base-ui/react` primitives / shadcn-style
  components, kept close to upstream but re-themed with `mv-*` tokens (`Button.tsx`, `Badge.tsx`,
  `Card.tsx`, `Switch.tsx`, `accordion.tsx`, `dialog.tsx`, `popover.tsx`, `dropdown-menu.tsx`,
  `drawer.tsx`, `select.tsx`, `input-group.tsx`, `Table.tsx`, `Skeleton.tsx`, `Tabs.tsx`, etc.)
- `components/minerva/*` — product-specific compositions built on top of the `ui` layer
  (`FormField.tsx`, `PageCard.tsx`, `CurrentUserAvatar.tsx`…). **Feature pages should reach for
  `minerva/*` first**; only drop to `ui/*` directly for something `minerva` doesn't wrap yet.

### 7.1 Button (`components/ui/Button.tsx`)

`cva`-based. Polymorphic: pass `href` to render a `Link`, otherwise a `@base-ui/react` `Button`.

```
variant: default|primary (bg-mv-green, hover bg-mv-green-dark, shadow-mv-sm)
       | secondary (bg-mv-surface, border-mv-border, hover bg-mv-cream-soft)
       | outline   (border-mv-border, bg-mv-surface, hover bg-mv-cream-soft)
       | ghost     (text-mv-ink-soft, hover bg-mv-ink/5)
       | destructive|danger (bg-mv-red, hover #963a2f)
       | lime      (bg-mv-lime, text-mv-green-darker)
       | link      (text-mv-green-dark, underline on hover)

size: default|md (h-9) | xs (h-6) | sm (h-8) | lg (h-10) | icon/icon-xs/icon-sm/icon-lg (square)
```

Icons inside a button carry `data-icon="inline-start"` or `data-icon="inline-end"` — the button
class list uses `has-data-[icon=inline-start]:pl-3` etc. to adjust padding automatically. Icons
default to `size-4` unless you set an explicit `size` on the icon.

### 7.2 Badge (`components/ui/Badge.tsx`)

`tone: green | lime | red | amber | neutral | ink`, `dot?: boolean` (renders a small tone-colored
dot before the label — used for severity indicators). `rounded-full px-2.5 py-1 text-[12px]
font-semibold`.

### 7.3 Card (`components/minerva/PageCard.tsx`, wrapping `components/ui/Card.tsx`)

The product-level `Card` is what pages actually use: `rounded-2xl border border-mv-border
bg-mv-surface shadow-mv-sm`, `padded` (default true, adds `p-5`). `CardHeader({ eyebrow?, title,
description?, action? })` renders an optional uppercase eyebrow, a `font-display text-[17px]
font-medium` title, optional description, and a right-aligned action slot.

### 7.4 PageHeader (`components/ui/PageHeader.tsx`)

Top-of-page header used by top-level feature pages (as opposed to admin pages, which inline an
`<h1>` directly — see §8): `{ eyebrow?, title, description?, action? }` →
`font-display text-[26px] font-medium tracking-tight` title, wraps on small screens, action slot
flows to the right.

### 7.5 FormField primitives (`components/minerva/FormField.tsx`)

The canonical form building blocks — always use these instead of raw `<input>`/`<select>`:

- `Input` — wraps shadcn `Input`, styled to `h-10 rounded-lg border-mv-border bg-mv-surface
  px-3 text-sm`, focus ring `focus-visible:border-mv-green focus-visible:ring-2
  focus-visible:ring-mv-green/15`.
- `Textarea` — same base, `min-h-24 py-2.5 leading-relaxed`.
- `Select` — native `<select>`, same base plus a custom inline-SVG chevron background and
  `appearance-none`.
- `Label` — `mb-1.5 block text-[12px] font-semibold text-mv-ink-soft`.
- `Field({ label, children, hint? })` — the composition every form field should actually render:
  label + control + optional `text-[12px] text-mv-ink-faint` hint line below.

### 7.6 EmptyState (`components/ui/EmptyState.tsx`)

`{ icon: LucideIcon, title, description?, action? }` → dashed border, `rounded-2xl
border-dashed border-mv-border bg-mv-cream-soft`, centered, a small circular
`bg-mv-green-tint text-mv-green-dark` icon chip above the title, `mv-animate-in`.

### 7.7 StatCard (`components/ui/StatCard.tsx`)

`{ label, value, delta?, icon, sublabel?, accent }` — label as uppercase eyebrow, an icon chip
top-right, a big `font-display text-[28px]` value, and a delta row (`ArrowUpRight`/
`ArrowDownRight` + percentage, green if positive / red if negative) plus an optional sublabel.
This is the standard KPI tile used across dashboards.

### 7.8 Accordion (`components/ui/accordion.tsx`)

`@base-ui/react/accordion` wrapper. `<Accordion multiple defaultValue={[...]}>` for
independently-openable sections (pass `multiple` — **not** `openMultiple**), or omit `multiple`
for single-open. `AccordionTrigger` auto-swaps a chevron-down/chevron-up icon based on open state.

### 7.9 Switch (`components/ui/Switch.tsx`)

`@base-ui/react/switch`. Controlled via `checked`/`onCheckedChange` (not `defaultChecked`/
`onChange`). `size: "sm" | "default"`. Override the checked-state color per use case with
`className="data-checked:bg-mv-red"` etc.

### 7.10 Table pattern

There is a `components/ui/Table.tsx` shadcn primitive, but most admin/list pages hand-roll a
plain `<table>` styled consistently instead:

```tsx
<div className="overflow-hidden rounded-2xl border border-mv-border bg-mv-surface shadow-mv-sm">
  <table className="w-full text-left text-[13px]">
    <thead>
      <tr className="border-b border-mv-border bg-mv-cream-soft">
        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-mv-ink-faint">…</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-mv-border-soft last:border-0">
        <td className="px-4 py-3">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 7.11 Toast conventions

`sonner`'s `toast.success(...)` / `toast.error(...)` after every mutation's server action result
— never a silent failure, never a blocking `alert()`.

## 8. Page-authoring patterns

Every route in this app is built from one of two shapes:

### 8.1 Data page: server `page.tsx` + client `*View.tsx` + `actions.ts`

```
app/[locale]/(group)/feature/
  page.tsx        — async Server Component: getTranslations(), fetch data via lib/data/*.ts,
                    render an <h1>/PageHeader + pass data as props into…
  FeatureView.tsx — "use client": owns local state, renders the actual UI, calls…
  actions.ts      — "use server": one exported async function per mutation, gated by an
                    auth/permission check at the top, calls lib/data/*.ts, then revalidatePath()
                    the page(s) affected, returns a boolean/typed result (never throws to the UI).
```

`lib/data/*.ts` is the **only** place Supabase queries live. It exports typed row→domain mappers
(snake_case DB columns → camelCase TS types) and plain async functions — no React, no
"use server", importable from both server components and actions.

### 8.2 Admin panel pages (`app/[locale]/admin/*`)

Slightly different shell (see §9) but the same three-file pattern, gated additionally by
`isPlatformAdmin()` (checks `profiles.is_platform_admin` for the current auth user) both in
`layout.tsx` (redirect non-admins to `/overview`) and again at the top of every `actions.ts`
function (defense in depth — RLS policies also enforce it at the DB level via a
`is_platform_admin()` SQL function).

### 8.3 Public token pages (`/m/[token]`, `/p/[code]`, `/r/[token]`, `/demo/[slug]`, `/portal`)

No sidebar/topbar. Own minimal `bg-mv-cream` page shell. Rate-limited via
`lib/rate-limit.ts` (`checkRateLimit(key, { max, windowSeconds })`, backed by a
`rate_limit_hits` Supabase table, not Redis). Data access goes through RLS policies scoped to
"anyone who knows this random token/slug," never through the admin/service-role client for reads.

## 9. Admin panel (`app/[locale]/admin/*`)

Separate top nav (not the main sidebar) — a thin `h-14` header bar (`bg-mv-cream-soft`,
`border-b`) with the Minerva wordmark + a `Shield` icon + "Panneau opérateur" label on the left,
inline nav links, and a "← Retour à l'application" link on the right. Content area:
`mx-auto max-w-5xl px-5 py-8`. Access gated by `isPlatformAdmin()` in `admin/layout.tsx`
(redirects to `/overview` otherwise).

**Current admin sections** (in nav order): Restaurants (`/admin/restaurants`, the index
redirects here), Pilotes (`/admin/pilots`), **Prospects** (`/admin/prospects` — see §10),
Support (`/admin/support`), Incidents (`/admin/incidents`, Loi 25 privacy-incident register),
Analytics (`/admin/analytics`, PostHog deep link), Changelog (`/admin/changelog`, publish +
notify-all-users).

Admin pages skip `PageHeader`/`Card` in favor of a lighter inline pattern:
`<h1 className="mb-1 font-display text-[22px] font-medium text-mv-ink">` +
`<p className="mb-6 text-[13px] text-mv-ink-soft">` description, then either a table (§7.10) or a
`grid grid-cols-1 sm:grid-cols-2 gap-3` of `rounded-2xl border border-mv-border bg-mv-surface p-4
shadow-mv-sm` cards.

## 10. The Prospects module — "1-Click Ingestor" / Demo Generator

This is the newest admin module and doubles as a worked example of every pattern above. It lets
a Minerva operator turn a restaurant's menu into an instantly-shareable, on-brand demo storefront
with a margin-leak pitch, in under a minute — **without** any external scraping service or LLM
call (deliberately: menu text is pasted manually and parsed with a deterministic heuristic
parser, not an AI model, keeping the pipeline free of external dependencies and API costs for
this stage of the product).

### 10.1 Data model

New table `prospects` (`supabase/migrations/0033_prospects.sql`), intentionally **separate**
from `restaurants` — no demo data ever touches production tenant tables until an operator
explicitly converts a prospect into a real customer (a manual, future step; today `converti` is
just a status label).

| Column | Notes |
|---|---|
| `source_url`, `source_platform` | enum: `uber_eats \| doordash \| skipthedishes \| direct_website \| raw_text \| other` |
| `restaurant_name`, `currency`, `detected_address` | operator-entered (no scraping) |
| `commission_rate_pct`, `assumed_monthly_orders` | inputs to the margin simulator |
| `status` | `draft \| ready \| contacte \| converti \| decline` |
| `demo_slug` | unique, public-facing (`/demo/[slug]`) |
| `menu_json` | `{ categories: [{ id, name, items: [{ id, name, description?, priceCents, inStock, dietaryTags[], modifierGroups[] }] }] }` — see `lib/prospects/types.ts` |
| `demo_view_count`, `last_viewed_at` | bumped by an anon-callable `increment_prospect_demo_view(slug)` SQL RPC, never a direct client write |

RLS: `is_platform_admin()` gets full CRUD; a second `select`-only policy allows the public demo
page to read a row **only when `demo_slug is not null`** — the same "possession of the random
token is the auth" pattern used by `/m/[token]` and `/p/[code]`.

### 10.2 Menu parsing without an LLM (`lib/prospects/parse-menu.ts`)

A small deterministic line-scanner: price-bearing lines (`Nom du plat — 12.50$`) become items;
short price-free lines become category headers; longer trailing text becomes an item description;
simple keyword matching tags `vegan`/`vegetarian`/`gluten_free`/`halal`/`kosher`/`spicy`/
`contains_nuts`. If nothing is pasted, `buildPlaceholderMenu()` seeds three example categories so
the rest of the UI (editor, demo page, margin calc) always has something to render — flagged
`isPlaceholder: true` so the demo page can show a "this is example content" notice.

### 10.3 Margin math (`lib/prospects/margin.ts`)

No real order history exists for a prospect, so the estimate is transparent and simple:
`avgOrderValue = avgMenuItemPrice × 1.8` (basket multiplier), `monthlyLoss = avgOrderValue ×
assumedMonthlyOrders × commissionRate%`. Both multiplier assumptions are visible/adjustable by
the operator, never hidden inside a black box.

### 10.4 Admin flow (`/admin/prospects`)

- **List** (`page.tsx` + `ProspectsListView.tsx`) — standard table pattern (§7.10): restaurant,
  status badge, estimated monthly loss, demo view count, created date.
- **Generator** (`/admin/prospects/new` and `/admin/prospects/[id]`, both rendering
  `ProspectGenerator.tsx`) implements the four-part UI from the product spec:
  1. **Ingestion Bar** — URL, restaurant name, platform, currency, commission %, assumed
     orders/month, and a "paste the menu text" textarea. Submitting animates a
     `PipelineTracker` (four simulated steps — reading, structuring, margin calc, instance
     ready — each ~450ms) purely for perceived-progress UX, then calls the real
     `createProspectAction` and routes to the detail page.
  2. **Pipeline Tracker** (`PipelineTracker.tsx`) — reusable step-badge row (pending/active/done
     states with Circle/Loader2/Check icons) — shown mid-generation and, statically "all done,"
     at the top of the detail page.
  3. **Quick Menu Editor** (`QuickMenuEditor.tsx`) — accordion of categories, inline price
     input + in-stock `Switch` + delete per item, single "Enregistrer les ajustements" save.
  4. **Outbound Hub** (`OutboundHub.tsx`) — copyable demo link, an auto-filled, editable pitch
     message built from the prospect's real first-priced item and its computed commission
     dollar amount, a "send by email" `mailto:` action, the margin simulation numbers, and a
     status `Select`.

### 10.5 Public demo page (`/demo/[slug]`)

No admin chrome. Minerva-branded header (logo + restaurant name + "Aperçu de démonstration"
badge — the identity stays Minerva's, per the product's positioning: *"vous vendez
l'infrastructure, pas le design"*), a dark savings banner
(`bg-mv-ink`/`text-mv-lime` amount) when a loss estimate exists, then the menu rendered as
category sections of item cards. Rate-limited and view-counted the same way `/m/[token]` is.

---

## 11. i18n conventions

- Two locale files, `messages/fr.json` (default) and `messages/tr.json`, both must stay in sync
  — **never ship a key to `fr.json` without adding the same key path to `tr.json`.**
- One flat nested tree, namespaced by feature (`admin.prospects.editor.saveChanges`, not a
  per-file split). Server components call `getTranslations("namespace")` from
  `next-intl/server`; client components call `useTranslations("namespace")`.
- ICU plural syntax is used for counts: `"{count, plural, one {# item} other {# items}}"`.
- Interpolation values passed as a second argument object: `t("key", { count, restaurantName })`.

## 12. Backend/data conventions

- `lib/supabase/server.ts` → `createClient()` — the RLS-respecting, per-request client; used for
  essentially everything, including admin reads (relying on `is_platform_admin()` RLS policies
  rather than bypassing RLS).
- `lib/supabase/admin.ts` → `createAdminClient()` — service-role, bypasses RLS entirely. Reserved
  for: rate limiting, and mutations from truly unauthenticated public forms (pilot request
  submission, etc.) where there is no user session to check RLS against. Never imported into a
  client component.
- SQL migrations live in `supabase/migrations/NNNN_description.sql`, sequential 4-digit prefix,
  applied in order. New tables always: `enable row level security` immediately after creation,
  then explicit named policies (`drop policy if exists "..." on table; create policy "..." ...`
  — the `drop`-then-`create` pair makes migrations safely re-runnable).
- Money is always stored/passed as **integer cents**, formatted for display via
  `formatCurrency(dollars)` from `lib/utils.ts` (which itself expects **dollars**, not cents — divide
  by 100 at the call site).

## 13. Do / Don't checklist

**Do:**
- Reach for an existing `mv-*` token before inventing a new color.
- Use `font-display` only for headings/titles/stat numbers — body text is always the sans stack.
- Keep card corners at `rounded-2xl`, control corners at `rounded-lg`, chips at `rounded-full`.
- Gate every admin mutation with `isPlatformAdmin()` in the action **and** rely on a matching RLS
  policy — never one without the other.
- Mirror every new `fr.json` key into `tr.json` in the same pass.
- Follow the server-page / client-view / server-actions three-file split for any new data page.

**Don't:**
- Don't introduce a gradient, a drop shadow heavier than `--shadow-mv-lg`, or a non-token color.
- Don't build a new page's data fetching directly inside a `"use client"` component — fetch
  server-side in `page.tsx` and pass props down.
- Don't bypass RLS with `createAdminClient()` from a context that has a real user session
  available — that client is for the no-session/public-form/rate-limiting case only.
- Don't add a 4th font family or deviate the sidebar's fixed 6-item core nav (§6.4.2) without an
  explicit product decision — it's a documented contract in `AGENTS.md`, not an accident.

---

*This document is maintained alongside the codebase. If the design tokens, shell layout, or
sidebar contract change, update this file in the same change.*
