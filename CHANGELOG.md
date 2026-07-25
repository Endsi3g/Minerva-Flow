# Changelog — Minerva Flow

Tous les changements notables apportés à Minerva Flow sont documentés dans ce fichier.

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
