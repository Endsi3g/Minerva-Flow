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
- **Top-Level Core Tools**: The sidebar navigation (`AppSidebar.tsx`) maintains 6 primary entrepreneur tools at the top level:
  1. `Overview` (`/overview`)
  2. `Flow AI` (`/assistant`)
  3. `Finance & Seuil` (`/finance`)
  4. `Commandes & Ventes` (`/commandes`)
  5. `Collaborateurs & Équipe` (`/collaborateurs`)
  6. `Inventaire & Stocks` (`/inventaire`)
- Secondary items are organized into collapsible, non-intrusive groups (`Opérations`, `Performance & Analytics`, `Paramètres et plus`).

## 3. Typographic System & Brand Design
- **Title & Heading Font**: `"New York"`, `-apple-system-serif`, with fallback to `Playfair Display`.
- **UI & Body Font**: `Plus Jakarta Sans`.
- **Monospace Font**: `JetBrains Mono`.
