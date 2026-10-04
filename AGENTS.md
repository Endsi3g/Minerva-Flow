<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Minerva Flow — Architectural & Performance Directives for Agents

## 1. High Scalability & Performance Guidelines (10,000+ Daily Page Visits)
- **Edge Caching & Static Prerendering (SSG/ISR)**: All public and static routes must utilize Next.js static prerendering to minimize server load.
- **Cloudflare AI Gateway Caching**: LLM calls via Vercel AI SDK use Cloudflare AI Gateway (`accountId: e4826a36912d92d343151792bb44fd46`) to cache repetitive prompts and optimize latency.
- **Bundle & Asset Optimization**: Keep client components light, use dynamic imports for heavy modals/charts, and optimize images using Next.js WebP/AVIF output.

## 2. Navigation & UX Conventions
- **Loyalty-ecosystem navigation only** (`components/shell/AppSidebar.tsx`, `MobileTabBar.tsx`): the sidebar lists `Overview`, `Flow AI`, `Fidélisation`, `Réputation` (reviews), `Menu` and `Commandes`, then collapsible groups limited to loyalty analytics (`Impact`, `Franchise`, retention funnel, `Maps`), customer reservations, and setup/help (`Paramètres`, `Intégrations`, `Facturation`, guide, support, changelog). The mobile tab bar shows Overview, Fidélisation, Menu and Commandes plus the restaurant switcher.
- Back-office pages (`finance`, `collaborateurs`, `inventaire`, `fournisseurs`, `horaire`, `mon-espace`, `employees`, `days`, `reports`, `programs`, `library`) are deliberately **not** in the sidebar (`NON_LOYALTY_NAV_KEYS`). They still work, are reachable from search and by address, and keep their per-member permissions. To bring one back, remove its key from that set.

## 3. Typographic System & Brand Design
- **Title & Heading Font**: `"New York"`, `-apple-system-serif`, with fallback to `Playfair Display`.
- **UI & Body Font**: `Plus Jakarta Sans`.
- **Monospace Font**: `JetBrains Mono`.

## 4. Brand Identity & Strict Naming Conventions
- **Official Brand Name**: **`Minerva Flow`** (or **`Flow`** in short context when clear).
- **STRICT FORBIDDEN TERM**: **`Flow par Minerva`** is STRICTLY FORBIDDEN across all UI, emails, documentation, marketing copy, titles, and AI prompts. Never use "Flow par Minerva".
- **Legal Entity**: `Minerva Technologies Inc.`
- **Domain**: `https://minervaflow.app`
- **Sender Address**: `Minerva Flow <flow@minervaflow.app>`
- **Aesthetic Excellence**: All emails and UI surfaces must follow the luxury editorial design system: warm cream surfaces (`#f5f1e6`, `#fafaf5`), emerald/forest tones (`#167f5b`, `#0e5a40`), New York serif headings, metric cards, and refined visual hierarchy. Plain unstyled text emails are strictly prohibited.
