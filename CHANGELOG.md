# Changelog — Minerva Flow

Tous les changements notables apportés à Minerva Flow sont documentés dans ce fichier.

## [v2.15.0] - 2026-07-25

### 🛠️ Correctifs de Fiabilité — Réservations & Fournisseurs
- **Réservations : Prévention des Doubles Réservations** :
  - Une table ne peut plus être assignée à deux réservations actives au même moment — vérification de conflit à la création et lors de la réattribution de table.
  - Message d'erreur clair affiché en cas de conflit (« Cette table est déjà réservée à cette heure »).
- **Fournisseurs : Fin des Échecs Silencieux à la Réception** :
  - Avertissement explicite désormais affiché si un article d'un bon de commande ne correspond à aucun article d'inventaire existant — auparavant, le stock n'était pas mis à jour sans aucune notification à l'utilisateur.

### 💬 Chat d'Équipe : Groupes, Messages Privés & Notes Vocales
- **Déploiement des Canaux Dynamiques** : Activation des groupes personnalisés et des conversations privées (DM) entre collaborateurs, en plus des 4 canaux fixes existants (`général`, `cuisine`, `service`, `urgences`).
- **Notes Vocales** : Enregistrement et envoi de messages vocaux dans n'importe quel canal.
- **Correctif de Sécurité Critique (RLS)** : Un membre exclu d'un canal privé ou d'un groupe pouvait auparavant lire et écrire dans ce canal via un accès direct à l'API, malgré les restrictions affichées dans l'interface. L'accès aux canaux privés est désormais réellement restreint au niveau de la base de données (lecture ET écriture) — vérifié en conditions réelles avec plusieurs comptes membres.

## [v2.14.0] - 2026-07-25

### ⚡ Suppression Totale des Animations de Transition Perturbantes
- **Élimination des Animations Spring & Slide dans l'Onboarding** :
  - Suppression des transitions Framer Motion avec ressorts (`spring layout`) et glissements latéraux (`x: 15 / x: -15`) sur l'Onboarding qui causaient des secousses et décalages d'interface.
  - Affichage instantané, solide et stable des étapes du parcours d'onboarding.
- **Formulaire d'Authentification Purifié** :
  - Retrait des animations de hauteur de formulaire et `mode="popLayout"` sur `AuthCard`.
  - Basculement direct et réactif entre Connexion et Inscription sans aucun décalage visuel.

## [v2.13.0] - 2026-07-25

### 🛠️ Correctifs & Améliorations Onboarding & OAuth
- **Persistance de l'Onboarding & des Intégrations** :
  - Sauvegarde automatique du restaurant et de son adresse Google Places à la fin du wizard (création automatique si aucun établissement préalable ne régit le compte).
  - Maintien de l'étape 4 dans l'URL (`?step=4`) pour éviter la réinitialisation de l'onboarding au début lors d'une connexion d'intégration.
  - Fenêtres popup sécurisées pour les flux OAuth avec statut "Connecté" conservé en stockage local.
- **Rendu Visuel des SVG Outils (Orbit & Cartes)** :
  - Badges ronds blancs haute définition avec ombrage et bordure subtile pour les icônes Orbit.
  - Cartes d'outils à fort contraste avec logos officiels (Square POS, Stripe, Google Calendar, Meta, Google Workspace) d'une netteté parfaite.
- **Animation de Morphing Fluide (Auth Layout)** :
  - Animation de transition morphing `motion.form layout` sans saut de hauteur ni glitch lors du basculement entre Connexion et Inscription.

## [v2.12.0] - 2026-07-25

### 🖥️ Full Screen Edge-to-Edge & Suppression des Animations Distrayantes
- **Passage en Plein Écran (Full Screen Edge-to-Edge)** :
  - Suppression de la carte/conteneur flottant avec marges extérieures (`max-w-6xl rounded-[32px] border shadow-2xl`).
  - Alignement direct des deux colonnes sur toute la largeur et hauteur de l'écran (`min-h-screen w-full`).
  - Application directe sur l'Onboarding (`OnboardingPage`) et les pages d'Authentification (`AuthCard`).
- **Élimination des Animations Intrusives** :
  - Retrait des animations pulsantes (`animate-ping`, `animate-pulse`, `animate-spin`) sur les graphiques, cercles et orbites.
  - Visuel SVG statique propre, élégant et fluide.

## [v2.11.0] - 2026-07-25

### 🎨 Perfectionnement Design Origin (Onboarding & Auth Container)
- **Conteneur Floating Origin-Style** :
  - Encadrement à coins très doux (`rounded-[32px]`, fond crème `#f7f6f2`, bordure subtile et ombre portée 2XL).
  - Proportion équilibrée 55% gauche / 45% droite pour une meilleure aération du contenu.
  - Harmonie visuelle unifiée entre la page d'authentification (`AuthCard`) et le parcours d'onboarding (`OnboardingPage`).
- **Panneau Visuel Nuit / Cosmétique Vert-Minerva (`OriginRightPanel`)** :
  - Fond sombre nuit/espace avec dégradé vert-nuit Minerva et poussière d'étoiles.
  - Slogan en police Serif New York / Playfair Display (*"Pilotez vos revenus, posez n'importe quelle question. Maîtrisez votre restaurant."*).
  - Badge étoiles `100+ ÉTABLISSEMENTS ★★★★★`.
  - Carte KPI glassmorphic translucide avec courbe de revenus SVG lisse et dates de suivi.

## [v2.10.0] - 2026-07-25

### 🚀 Nouveautés & Fonctionnalités (Features)
- **Nouvelle Étape d'Onboarding "Connectez vos outils"** :
  - Intégration d'un module d'association d'outils d'exploitation au sein de l'assistant d'onboarding (`OnboardingWizard`).
  - Support de **Square POS**, **Stripe Connect**, **Google Calendar**, **Meta (FB & IG)** et **Google Workspace**.
  - Présentation avec animation Orbit visuelle et grille de cartes d'action interactives.
  - Option de passer l'étape à tout moment pour terminer l'onboarding sans blocage.

- **Refonte Visuelle de la Page d'Authentification (Auth / Login Flow)** :
  - Nouvel écran d'authentification split 50/50 inspiré du design Origin.
  - Panneau de formulaire épuré à gauche (Connexion Google + Email/Mot de passe).
  - Panneau visuel à droite sur fond ambiancé café montréalais style Melk (accents vert menthe, béton brut, bois clair).
  - Badge étoiles "100+ établissements" et carte KPI financière dynamique avec sparkline de croissance.

### 🛡️ Conformité & Sécurité OAuth Google
- Validation de la propriété de domaine via la balise meta de vérification Google Search Console.
- Alignement du nom de la marque ("Minerva Flow") sur la page d'accueil et les métadonnées SEO/OpenGraph.
- Clarification de la proposition de valeur et des objectifs d'exploitation SaaS sur la page de destination (Hero section).

---

## [v1.3.0] - 2026-07-16
- Améliorations du tableau de bord opérationnel, des rapports d'activité et des performances de préchargement.
