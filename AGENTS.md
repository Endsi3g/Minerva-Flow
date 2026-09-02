<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Minerva Flow — Architectural & Performance Directives for Agents

## 1. High Scalability & Performance Guidelines (10,000+ Daily Page Visits)
- **Edge Caching & Static Prerendering (SSG/ISR)**: All public and static routes must utilize Next.js static prerendering to minimize server load.
- **Cloudflare AI Gateway Caching**: LLM calls via Vercel AI SDK use Cloudflare AI Gateway (`accountId: e4826a36912d92d343151792bb44fd46`) to cache repetitive prompts and optimize latency.
- **Bundle & Asset Optimization**: Keep client components light, use dynamic imports for heavy modals/charts, and optimize images using Next.js WebP/AVIF output.

## 2. Navigation & UX Conventions
- **Top-Level Core Tools (role-conditional)**: The sidebar navigation (`AppSidebar.tsx`) is LTV-first for `owner`/`manager` and full-operational for `staff`/`consultant`:
  - **Owner/Manager** — condensed core list, LTV ecosystem only: `Overview`, `Flow AI`, `Menu`, `Fidélisation`. `Finance`, `Commandes`, `Collaborateurs`, `Inventaire` are one click away in the collapsible "Gestion quotidienne" section, not removed.
  - **Staff/Consultant** — full flat list at the top level (unchanged from before): `Overview`, `Flow AI`, `Menu`, `Fidélisation`, `Finance` (role-gated), `Commandes`, `Collaborateurs`, `Inventaire` (role-gated) — this role needs daily operational access without an extra click.
- Secondary items are organized into collapsible, non-intrusive groups (`Gestion quotidienne` [owner/manager only], `Opérations`, `Performance & Analytics`, `Paramètres et plus`).

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
