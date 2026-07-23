<div align="center">

<img src="public/icon-512.png" width="88" alt="Logo Minerva Flow" style="border-radius: 18px; margin-bottom: 14px;" />

# Minerva Flow

### Système d'Exploitation & d'Analyse Intelligente pour Restaurants et Cafés

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

## 🍽️ Aperçu Général

**Minerva Flow** est la plateforme logicielle complète conçue pour simplifier et unifier le pilotage quotidien des établissements de restauration indépendants, cafés, bistros et brasseries au Québec et en France.

Dans un secteur où les marges sont souvent serrées et les opérations fragmentées entre de multiples outils incomplets, Minerva Flow offre une interface centralisée, intuitive et moderne. Elle permet aux propriétaires et gérants d'éliminer la gestion manuelle sur papier ou tableur, d'optimiser leurs coûts de revient et d'assurer une rentabilité durable.

---

## 🚀 Ce qu'apporte l'application aux restaurateurs

### 1. Pilotage Financier & Rentabilité Quotidienne
Suivi en temps réel du chiffre d'affaires, des coûts fixes, du taux de marge brute (Food Cost %) et du panier moyen. Le **Simulateur de Seuil de Rentabilité** permet de calculer instantanément le point mort mensuel, l'objectif quotidien de revenus et le nombre de clients requis par jour pour atteindre l'équilibre financier.

### 2. Assistant d'Intelligence Artificielle (Flow AI)
Un assistant virtuel spécialisé (propulsé par Cloudflare AI Gateway & Vercel AI SDK) analyse en permanence les données d'exploitation de l'établissement. Il identifie les dérives de coûts, suggère des ajustements de prix, détecte les anomalies de stock et génère des recommandations stratégiques personnalisées.

### 3. Navigation Latérale Épurée & Accès Direct
La barre de navigation (`AppSidebar.tsx`) regroupe au niveau supérieur les **6 outils indispensables** utilisés 90% du temps par les restaurateurs :
* **Aperçu (`/overview`)** — Tableau de bord général.
* **Flow AI (`/assistant`)** — Assistant conversationnel IA.
* **Finance & Seuil (`/finance`)** — Simulateur de point mort et marges.
* **Commandes & Ventes (`/commandes`)** — Suivi des ventes POS & réservations.
* **Collaborateurs (`/collaborateurs`)** — Gestion d'équipe et employés.
* **Inventaire & Stocks (`/inventaire`)** — Matières premières et ingrédients.

### 4. Planification d'Équipe & Synchronisation Google Calendar
La gestion des horaires s'adapte à la réalité du personnel de restauration. La synchronisation bidirectionnelle avec Google Calendar permet de lire automatiquement les indisponibilités, congés et engagements personnels des employés avant la publication des plannings.

### 5. Gestion des Fournisseurs, Commandes & Contrôle du Gaspillage
Numérisation de la relation fournisseur. Les bons de commande sont générés et transmis directement depuis l'application. Dès la réception des marchandises, les stocks sont mis à jour et les pertes ou produits avariés sont comptabilisés dans les charges pour ajuster précisément le coût réel de chaque portion.

### 6. Ingénierie de Menu & Optimisation des Marges Brutes
Chaque plat de la carte est automatiquement classé selon sa popularité et sa rentabilité (*Étoiles, Poids morts, Énigmes, Chevaux de bataille*). Cette analyse permet au chef et au restaurateur de retravailler les recettes peu rentables et d'optimiser l'affichage du menu.

### 7. Fidélisation Client, Parrainage & Portail Libre-Service
L'application intègre un programme de fidélité complet. Les clients peuvent rejoindre le programme via un QR code, accumuler des points et accéder à un portail dédié sécurisé sans mot de passe (*Lien Magique*) pour consulter leur solde et partager leur lien de parrainage.

### 8. Présence Numérique, Avis Google Business & Commandes Directes
Les avis laissés par les clients sur Google Business Profile sont centralisés pour permettre une réponse rapide. L'établissement bénéficie également d'un module de commande en ligne directe sans commission, avec paiement sécurisé Stripe Connect crédité directement au restaurant.

### 9. Bibliothèque d'Assets & Documents Utiles
Tous les documents essentiels de l'établissement (factures d'achats, fiches techniques de recettes, permis, manuels d'exploitation) sont archivés et classés dans une bibliothèque d'assets dotée d'un tiroir de prévisualisation rapide.

### 10. Journal des Nouveautés In-App (Changelog)
Un espace dédié au suivi des mises à jour permet à l'équipe de consulter l'historique des nouvelles fonctionnalités et améliorations déployées sur la plateforme.

---

## ⚡ Architecture Haute Scalabilité (10 000+ Visites / Jour)

Minerva Flow est conçu pour supporter des montées en charge massives avec des temps de réponse ultra-rapides :

1. **Rendu Préréduit Edge (SSG / ISR Next.js 16)** : Pages publiques et tableaux de bord pré-rendus sur le réseau Edge Vercel pour minimiser l'empreinte serveur (TTFB < 50ms).
2. **Accelerated AI Gateway (Cloudflare Edge)** : L'ensemble des appels LLM passe par le réseau Cloudflare AI Gateway avec mise en cache intelligente des requêtes récurrentes.
3. **Design System New York & Shadcn UI** : Intégration complète de la suite de composants Shadcn UI (`Card`, `Slider`, `Alert`, `StatCard`, `Message`, `Bubble`, `Attachment`) combinée au système typographique **New York** (Apple System Serif) & **Plus Jakarta Sans**.

---

## 🛠️ Spécifications Techniques

- **Framework Web** : Next.js 16 (App Router, Turbopack, React 19)
- **Langage** : TypeScript
- **Base de données & Auth** : Supabase (PostgreSQL RLS, Supabase Auth, Vault)
- **Réseau AI Gateway & Cache Edge** : Cloudflare Workers AI Gateway
- **Composants UI** : Suite officielle Shadcn UI avec Vanilla CSS sur-mesure
- **Intégrations POS & Monétique** : Square POS API, Stripe Connect, Stripe Checkout
- **Services Webhooks & Cron** : Square Webhooks, Cron Jobs automatiques
- **Hébergement Cloud** : Vercel Production Infrastructure

---

<div align="center">

*Minerva Flow — Système de Gestion et d'Analyse pour Restaurants au Québec & en France*

</div>