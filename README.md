# Minerva-Flow

Application SaaS pour la gestion opérationnelle des restaurants, cafés et bars : réservations, tables, commandes, clients et performances.

---

## 1. Description

Minerva-Flow offre une vue d’ensemble claire des opérations quotidiennes d’un établissement de restauration.  
L’objectif est de centraliser les informations clés dans une interface moderne et simple à utiliser, même pendant les heures de pointe.

---

## 2. Fonctionnalités

- Gestion des réservations et des tables.
- Suivi des commandes et de leur état (en cours, prêt, servi).
- Fiches clients et historique des visites.
- Indicateurs de performance (remplissage, ventes, ticket moyen).
- Interface web accessible depuis n’importe quel navigateur.

---

## 3. Public cible

- Restaurants indépendants.  
- Cafés, bistros et brasseries.  
- Bars et établissements de nuit.  
- Groupes de restaurants souhaitant une vue consolidée.

---

## 4. Stack technique

- Framework : Next.js (app router).  
- Langage : TypeScript.  
- UI : Tailwind CSS, shadcn/ui.  
- Backend et base de données : Supabase (PostgreSQL, auth).  
- Authentification : Supabase Auth et middleware Next.js.  

Cette stack permet une évolution rapide tout en restant fiable et maintenable [page:1].

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

3. Configurer les variables d’environnement (Supabase, etc.).

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

Cette organisation vise à séparer clairement UI, logique métier et infrastructure [page:1].

---

## 7. Automatisation et agents

Le projet utilise des fichiers de configuration d’agents pour faciliter le développement et la génération de contenu :

- `AGENTS.md` : description des agents et de leurs rôles.  
- `CLAUDE.md` et dossier `.claude` : workflows assistés par IA pour le projet [page:1].

Ces ressources peuvent être utilisées pour documenter, prototyper ou automatiser certaines tâches.

---

## 8. État du projet et roadmap

Minerva-Flow est en phase de développement actif.

Axes sur lesquels le projet évolue :

- Consolidation des écrans de gestion de tables, commandes et réservations.  
- Amélioration continue de la navigation, du sidebar francophone et de l’ergonomie en service [page:1].  
- Intégration de vues cartographiques et de blocs UI métier.  

Prochaines étapes envisagées :

- Gestion des équipes et des shifts.  
- Reporting avancé par jour, plat, serveur et service.  
- Intégrations avec des solutions de paiement et de caisse.

---

## 9. Contribution et contact

Les retours et contributions sont les bienvenus.

- Ouverture d’issues pour signaler un problème ou proposer une amélioration.  
- Pull requests pour des contributions sur l’UX, le code ou la documentation.  
- Prise de contact pour tests en conditions réelles dans des établissements de restauration.

Minerva-Flow vise à devenir une solution simple, fiable et adaptée aux réalités du terrain pour les professionnels de la restauration.