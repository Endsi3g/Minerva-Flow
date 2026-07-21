# Flow par Minerva

Application SaaS pour la gestion opérationnelle des restaurants et cafés au Québec : revenus, dépenses, équipe, fournisseurs, inventaire, fidélisation et rapports — avec un portail dédié pour les clients.

---

## 1. Description

Flow par Minerva centralise le pilotage quotidien d'un restaurant ou café dans une interface simple, en français, pensée pour être utilisée même pendant les heures de pointe. Au-delà du suivi financier, l'app couvre l'ensemble du cycle d'exploitation : de la commande fournisseur jusqu'à la fidélisation du client final, avec des rapports générés par IA pour interpréter les chiffres.

---

## 2. Fonctionnalités

- **Journées et finance** — saisie (ou import CSV) des revenus/dépenses quotidiens, catégorisation, connexions bancaires/POS (Square).
- **Programmes et campagnes** — sources de revenu récurrentes (brunchs, soirées, événements) et campagnes marketing (Instagram, Facebook, courriel).
- **Fidélisation client** — fiches clients, points de fidélité, catalogue de récompenses, programmes de parrainage avec suivi des conversions.
- **Portail client** (`/portal`) — vos clients se connectent sans mot de passe (lien magique) pour voir leurs points et partager leur lien de parrainage, sans accès au reste de l'application.
- **Ingénierie de menu** — classification automatique des plats (étoiles, chevaux de bataille, énigmes, poids morts) selon marge et popularité.
- **Inventaire et gaspillage** — quantités en main, seuils de réapprovisionnement, coût du gaspillage répercuté automatiquement dans les dépenses.
- **Fournisseurs** — répertoire, commandes (brouillon → envoyée → reçue), suivi de livraison (trajet et ETA), réception liée à l'inventaire.
- **Réservations** — gestion des tables en interne, et demandes de réservation publiques via un lien de parrainage.
- **Équipe** — invitations unifiées (collaborateurs et employés) avec envoi automatique par courriel, horaire, quarts, évaluations de performance, rôles et permissions (propriétaire/gérant/employé/consultant), espace personnel employé (`/mon-espace`) avec pointage (arrivée/départ, en libre-service ou par un gérant), suivi des heures et de la paie par période (semaine, aux deux semaines, mois), et notifications de retard ou d'absence à un quart prévu.
- **Établissements** — recherche Google Places pour importer automatiquement adresse/coordonnées/téléphone/horaires, ou extraction automatique depuis le site web de l'établissement (description, coordonnées, horaires).
- **Rapports et revue IA** — métriques hebdomadaires automatiques et à la demande, générées par IA à partir des chiffres réels (revenu, marge, menu, gaspillage).
- **Cartes** — établissements (avec effet de survol animé à la sélection), attribution publicitaire, trajets de livraison.
- **Intégrations** — Google (Places, Ads, Workspace, Calendar), Meta Ads, Square, Resend (courriels transactionnels), avec un guide de connexion intégré.
- Interface web progressive (PWA), accessible depuis n'importe quel navigateur ou installable comme application.

---

## 3. Public cible

- Restaurants indépendants.  
- Cafés, bistros et brasseries.  
- Bars et établissements de nuit.  
- Groupes de restaurants souhaitant une vue consolidée.

---

## 4. Stack technique

- Framework : Next.js 16 (App Router), Turbopack.
- Langage : TypeScript.
- UI : Tailwind CSS, shadcn/ui, Framer Motion.
- Backend et base de données : Supabase (PostgreSQL, Auth, Storage, Row Level Security).
- Authentification : Supabase Auth (mot de passe, OAuth Google/Apple/Microsoft, lien magique pour le portail client) et middleware Next.js.
- IA : Vercel AI SDK, pour les revues de performance et l'assistant conversationnel.
- Déploiement : Vercel.

Cette stack permet une évolution rapide tout en restant fiable et maintenable.

---

## 5. Installation

Prérequis : Node.js, gestionnaire de paquets (npm, yarn, pnpm ou bun), accès à un projet Supabase configuré.

1. Cloner le dépôt :

   ```bash
   git clone https://github.com/Endsi3g/Minerva-Flow.git
   cd Minerva-Flow
   ```

2. Installer les dépendances :

   ```bash
   npm install
   # ou
   yarn install
   # ou
   pnpm install
   # ou
   bun install
   ```

3. Configurer les variables d’environnement (`.env.local` — clés Supabase, `NEXT_PUBLIC_APP_URL`, clés d'intégration selon les besoins), puis exécuter les migrations dans `supabase/migrations/` (éditeur SQL Supabase ou `supabase db push`).

4. Lancer le serveur de développement :

   ```bash
   npm run dev
   # ou
   yarn dev
   # ou
   pnpm dev
   # ou
   bun dev
   ```

5. Ouvrir l’application à l’adresse suivante :

   - http://localhost:3000

---

## 6. Architecture générale

- Dossier `app` : routes et pages de l’interface Next.js.  
- Dossier `components` : composants UI réutilisables.  
- Dossier `lib` : utilitaires, intégrations et services.  
- Dossier `supabase` : schémas, scripts et configuration de la base de données.  
- Dossier `scripts` : scripts CLI et automatisations.  

Cette organisation vise à séparer clairement UI, logique métier et infrastructure.

---

## 7. Automatisation et agents

Le projet utilise des fichiers de configuration d’agents pour faciliter le développement et la génération de contenu :

- `AGENTS.md` : description des agents et de leurs rôles.  
- `CLAUDE.md` et dossier `.claude` : workflows assistés par IA pour le projet.

Ces ressources peuvent être utilisées pour documenter, prototyper ou automatiser certaines tâches.

---

## 8. État du projet et roadmap

Flow par Minerva est en développement actif et déjà utilisé en production. Les modules listés en section 2 (finance, fidélisation, menu, inventaire, portail client, rapports IA) sont fonctionnels, couverts par une suite de tests automatisés (Vitest pour la logique métier, Playwright pour les parcours critiques) qui tourne en continu.

Prochaines étapes envisagées :

- Commande en ligne complète depuis le menu partagé : image sur les plats, lien public, prix avec taxes, pourboire, et routage direct de la commande vers l'application (sans paiement par carte réel dans un premier temps).
- Paiement par carte intégré (Stripe), une fois la commande en ligne en place.
- Intégrations de réservation tierces (OpenTable, Resy) et suivi Uber Direct/Eats, sous réserve d'un partenariat d'affaires actif avec ces plateformes.
- Partage par lien/QR pour les programmes de fidélisation (comme le partage de menu existant).
- Suivi de commande fournisseur étendu (statuts intermédiaires, détection des retards de livraison).
- Import automatique de menu existant (PDF ou site web de l'établissement).
- Flow de démonstration à l'onboarding avec offre d'essai gratuit.

---

## 9. Contribution et contact

Les retours et contributions sont les bienvenus.

- Ouverture d’issues pour signaler un problème ou proposer une amélioration.  
- Pull requests pour des contributions sur l’UX, le code ou la documentation.  
- Prise de contact pour tests en conditions réelles dans des établissements de restauration.

Flow par Minerva vise à devenir une solution simple, fiable et adaptée aux réalités du terrain pour les professionnels de la restauration.