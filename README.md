<div align="center">

<img src="public/icon-512.png" width="88" alt="Logo Flow par Minerva" style="border-radius: 18px; margin-bottom: 14px;" />

# Flow par Minerva

### Plateforme de gestion opérationnelle unifiée pour restaurants et cafés

[![Statut Vercel](https://img.shields.io/badge/Vercel-Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://minerva-flow.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Licence](https://img.shields.io/badge/Licence-Propriétaire-2D3748?style=for-the-badge)](#-licence)

<br />

[Accéder à l'application](https://minerva-flow.vercel.app) • [Guide des intégrations](docs/integrations.md) • [Politique de confidentialité](app/[locale]/legal/privacy/page.tsx) • [Conditions d'utilisation](app/[locale]/legal/terms/page.tsx)

<br /><br />

<img src="public/demo.png" alt="Aperçu de l'interface Flow par Minerva" width="100%" style="border-radius: 12px; border: 1px solid #E2E8F0;" />

</div>

---

## Aperçu Général

 Flow par Minerva est la solution logicielle conçue pour simplifier et unifier le pilotage quotidien des établissements de restauration indépendants, cafés, bistros et brasseries.

Dans un secteur où les marges sont souvent serrées et les opérations fragmentées entre de multiples outils incomplets, Flow par Minerva offre une interface centralisée, intuitive et entièrement en français. Elle permet aux propriétaires et gérants d'éliminer la gestion manuelle sur papier ou tableur, d'optimiser leurs coûts de revient et d'assurer une expérience client irréprochable.

---

## Ce qu'apporte l'application aux établissements

### 1. Pilotage Financier & Rentabilité Quotidienne
La plateforme permet de suivre en temps réel le chiffre d'affaires, les coûts des marchandises vendues et les dépenses d'exploitation. Grâce à la synchronisation automatique avec le point de vente Square et l'import bancaire, les gestionnaires disposent d'un tableau de bord financier précis sans perte de temps à la fermeture des caisses.

### 2. Assistant d'Intelligence Artificielle & Analyses Décisionnelles
Un assistant virtuel spécialisé analyse en permanence les données d'exploitation de l'établissement. Il identifie les dérives de coûts, suggère des ajustements sur les prix du menu, détecte les anomalies de stock et génère des synthèses hebdomadaires claires pour aider le gestionnaire à prendre les bonnes décisions stratégiques.

### 3. Journal des Nouveautés In-App
Un espace dédié au suivi des mises à jour permet à l'équipe de consulter l'historique des nouvelles fonctionnalités, des améliorations apportées et des correctifs déployés sur la plateforme. Cela garantit une adoption fluide et une transparence totale sur les évolutions du produit.

### 4. Planification d'Équipe & Synchronisation Bidirectionnelle Google Calendar
La gestion des horaires s'adapte à la réalité du personnel de restauration. La synchronisation à deux sens avec Google Calendar permet de lire automatiquement les indisponibilités, congés et engagements personnels des employés avant la publication des plannings, évitant ainsi les conflits d'horaires et les absences imprévues.

### 5. Gestion des Fournisseurs, Commandes & Contrôle du Gaspillage
Flow par Minerva numérise la relation fournisseur. Les bons de commande sont générés et transmis directement depuis l'application. Dès la réception des marchandises, les stocks sont mis à jour et les pertes ou produits avariés sont comptabilisés dans les charges pour ajuster précisément le coût réel de chaque portion.

### 6. Ingénierie de Menu & Optimisation des Marges Brutes
Chaque plat de la carte est automatiquement classé selon sa popularité et sa rentabilité (Étoiles, Poids morts, Énigmes, Chevaux de bataille). Cette analyse permet au chef et au restaurateur de retravailler les recettes peu rentables, de réorganiser l'affichage du menu et d'augmenter la marge brute globale.

### 7. Fidélisation Client, Parrainage & Portail en Libre-Service
L'application intègre un programme de fidélité complet. Les clients peuvent rejoindre le programme via un QR code, accumuler des points et accéder à un portail dédié sécurisé sans mot de passe (Lien Magique) pour consulter leur solde de points et partager leur lien de parrainage.

### 8. Présence Numérique, Avis Google Business & Commandes Directes
Les avis laissés par les clients sur Google Business Profile sont centralisés dans l'application pour permettre une réponse rapide. L'établissement bénéficie également d'un module de commande en ligne directe sans commission, avec paiement sécurisé Stripe Connect crédité directement sur le compte du restaurant.

### 9. Bibliothèque d'Assets & Documents Utiles
Tous les documents essentiels de l'établissement (factures d'achats, fiches techniques de recettes, permis, manuels d'exploitation) sont archivés et classés dans une bibliothèque d'assets dotée d'un tiroir de prévisualisation rapide.

### 10. Hub d'Intégrations API
Une vue consolidée affiche le statut des connexions en temps réel avec les services tiers tiers (Square POS, Stripe, Google Analytics, Google Workspace, Uber Eats, Resend), facilitant la maintenance technique par le gestionnaire.

---

## Conformité et Protection des Données

- **Conformité à la Loi 25 du Québec** : Respect rigoureux des normes de protection des renseignements personnels et des droits d'accès.
- **Politique d'utilisation limitée des API Google** : Respect des exigences de sécurité et de confidentialité de Google Cloud Console pour le traitement des données utilisateur.

---

## Spécifications Techniques

Cette section résume l'infrastructure sur laquelle repose la plateforme :

- **Framework Web** : Next.js 16 (App Router, Turbopack, React 19)
- **Langage** : TypeScript
- **Base de données & Authentification** : Supabase (PostgreSQL avec Row Level Security, Supabase Auth, Vault)
- **Design System** : Vanilla CSS sur-mesure avec variables de marque, icônes vectorielles officielles `@thesvg/react`
- **Intégrations Monétiques & POS** : Square POS API, Stripe Connect, Stripe Checkout
- **Services Transactionnels** : Resend API (courriels), Google Workspace API, Google Places API
- **Hébergement & Infrastructure** : Vercel Cloud Platform

---

<div align="center">

*Flow par Minerva — Développé pour la restauration au Québec*

</div>