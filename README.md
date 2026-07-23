<div align="center">

<img src="public/icon-512.png" width="88" alt="Logo Minerva Flow" style="border-radius: 18px; margin-bottom: 14px;" />

# Minerva Flow

### Système d'Exploitation & d'Analyse Intelligente pour Restaurants

[![Statut Vercel](https://img.shields.io/badge/Vercel-Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://minerva-flow.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-AI%20Gateway-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br />

[Accéder à l'application](https://minerva-flow.vercel.app) • [Sitemap XML](https://minerva-flow.vercel.app/sitemap.xml) • [Guide des intégrations](docs/integrations.md) • [Politique de confidentialité](app/[locale]/legal/privacy/page.tsx) • [Conditions d'utilisation](app/[locale]/legal/terms/page.tsx)

<br /><br />

</div>

---

## ⚡ Architecture Haute Scalabilité (10 000+ Visites / Jour)

Minerva Flow est conçu pour supporter des montées en charge massives avec des temps de réponse ultra-rapides :

1. **Rendu Préréduit Edge (SSG / ISR Next.js 16)** : Pages publiques et tableaux de bord pré-rendus sur le réseau Edge Vercel pour minimiser l'empreinte serveur et réduire le temps de chargement (TTFB < 50ms).
2. **Accelerated AI Gateway (Cloudflare Edge)** : L'ensemble des appels LLM (Llama 3.3 70B, Kimi K2.6) passe par le réseau Cloudflare AI Gateway avec mise en cache intelligente des requêtes récurrentes.
3. **Design System Épuré & Composants Shadcn UI** : Intégration complète de la suite de composants Shadcn UI (`Card`, `Slider`, `Alert`, `StatCard`, `Message`, `Bubble`, `Attachment`) combinée au système typographique **New York** (Apple System Serif) & **Plus Jakarta Sans**.

---

## 🧭 Navigation & Expérience Utilisateur Repensée

La navigation latérale (`AppSidebar.tsx`) a été optimisée pour donner un accès direct et instantané aux **6 outils stratégiques** utilisés 90% du temps par les restaurateurs :

1. **Aperçu Général (`/overview`)** — Tableau de bord financier et opérationnel unifié.
2. **Flow AI (`/assistant`)** — Assistant conversationnel décisionnel alimenté par Cloudflare AI.
3. **Finance & Seuil de Rentabilité (`/finance`)** — Simulateur interactif de point mort et marges.
4. **Commandes & Ventes (`/commandes`)** — Suivi en temps réel des ventes POS Square & réservations.
5. **Collaborateurs & Équipe (`/collaborateurs`)** — Gestion du personnel et plannings d'équipe.
6. **Inventaire & Stocks (`/inventaire`)** — Gestion des matières premières, achats et pertes.

Les fonctionnalités secondaires sont regroupées de manière fluide dans des sections repliables (`Opérations`, `Performance & Analytics`, `Paramètres et plus`) afin de conserver une interface épurée et navigable.

---

## 🛠️ Spécifications Techniques

- **Framework Web** : Next.js 16 (App Router, Turbopack, React 19)
- **Langage** : TypeScript
- **Base de données & Auth** : Supabase (PostgreSQL RLS, Supabase Auth, Vault)
- **Réseau AI Gateway & Cache Edge** : Cloudflare Workers AI Gateway
- **Composants UI** : Suite officielle Shadcn UI avec Vanilla CSS sur-mesure
- **Intégrations POS & Monétique** : Square POS API, Stripe Connect, Stripe Checkout
- **Services Webhooks & Cron** : Square Webhooks, Cron Jobs automatiques (Rapports hebdo & Late Shifts)
- **Hébergement Cloud** : Vercel Production Infrastructure

---

<div align="center">

*Minerva Flow — Système de Gestion et d'Analyse pour Restaurants au Québec & en France*

</div>