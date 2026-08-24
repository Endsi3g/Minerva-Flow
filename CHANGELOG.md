# Changelog — Minerva Flow

Tous les changements notables apportés à Minerva Flow sont documentés dans ce fichier.

## [v2.18.0] - 2026-08-24

### 🧭 Sidebar & Aperçu centrés sur le LTV (owner/manager)
- Pour les propriétaires et gérants, la sidebar affiche désormais une liste condensée (Aperçu, Flow AI, Menu, Fidélisation, Impact LTV, Vue franchise) — les outils opérationnels (Finance, Commandes, Collaborateurs, Inventaire) et les rapports génériques restent accessibles en un clic, mais repliés par défaut au lieu de mélanger contenu LTV et non-LTV dans les mêmes menus. Le staff garde l'accès complet inchangé.
- **Aperçu** se réoriente autour de l'écosystème LTV pour owner/manager : impact chiffré (revenu incrémental, gain de marge du menu, fréquence de visite), santé du menu (répartition BCG + dérive de marge) et aperçu fidélisation (paliers, clients inactifs, anniversaires à venir) — chacun cliquable vers le détail. Les widgets financiers/opérationnels génériques restent une clic plus loin.

### 💳 Récompenses en libre-service
- Le client échange ses points depuis son espace client et reçoit un code à montrer en caisse ; le personnel le valide directement depuis Fidélisation. Catalogue de récompenses démo peuplé.

### 📈 Impact LTV & vue franchise
- Nouvelle page **Impact LTV** chiffrant le gain de marge du menu actif et la fréquence de visite des clients touchés par la rétention vs non touchés, par segmentation plutôt que comparaison arbitraire avant/après.
- Nouvelle page **Vue franchise** agrégeant cet impact sur plusieurs établissements d'un même workspace.

### 🔗 Menu partageable
- Partage du menu (générique, sur le menu public) et partage récompensé après une commande confirmée, réutilisant l'infrastructure de parrainage déjà éprouvée.

### ✨ Détails soignés
- Carte de fidélité visuelle par palier avec barre de progression dans l'espace client, chronologie visuelle des transactions dans la fiche client, micro-interactions de confirmation sur les moments de succès.

## [v2.17.0] - 2026-08-23

### 🎯 Repositionnement produit : Menu Engineering & Fidélisation
- Le produit se recentre sur deux piliers : rentabilité du menu (matrice BCG, alerte de dérive de marge) et fidélisation/rétention (moteur LTV) — plus de simulateur de tarification dynamique.
- **Menu** : matrice BCG (Étoiles / Chevaux de bataille / Énigmes / Poids morts), panneau de dérive de marge avec action « Retirer du menu » en un clic, et idées de campagnes générées par IA avec bouton « Lancer cette campagne ».

### 💌 Moteur de rétention automatisé & paliers premium
- Relance automatique et multi-canal (courriel → notification push → SMS) des clients inactifs, en décrochage de valeur, ou dont l'anniversaire approche — respecte le consentement marketing et un plafond de fréquence anti-spam.
- Paliers de fidélité premium — Habitué, Privilégié, Ambassadeur — configurables par établissement.
- Parrainage à double sens : le parrain et le nouveau client reçoivent chacun une récompense immédiate à la conversion.
- **Aperçu** : nouvelle carte « Revenu incrémental — fidélisation », chiffrant le revenu généré par les relances automatiques.

### 🔌 Intégration caisse (POS) multi-fournisseur
- L'architecture POS est généralisée à plusieurs fournisseurs (Square, en production ; Lightspeed Restaurant, prêt à activer dès qu'un compte développeur est fourni) au lieu d'être câblée uniquement pour Square.
- `/settings` affiche un statut honnête par fournisseur (connecté / en erreur / pas encore disponible) plutôt qu'un état générique.

### 🔐 Appareils connectés
- **Paramètres → Sécurité** : chaque utilisateur peut voir les appareils connectés à son compte (appareil, navigateur, dernière activité) et déconnecter ceux qui ne lui appartiennent pas — sans jamais restreindre les connexions multiples légitimes.

### 📖 Guide de démarrage du compte démo
- Le compte de démonstration affiche, à la première utilisation, un guide en 5 étapes (comment utiliser l'application, comment elle a été construite, la mentalité produit, ce qui est déjà implémenté, comment percevoir la valeur) — réouvrable à tout moment.
- Nouvelles infobulles contextuelles sur les réglages de rétention et les paliers de fidélité.

### 🛠️ Correctifs de fiabilité
- **Finance** : corrige un flux net incohérent (les sorties étaient parfois comptées deux fois) — les entrées, sorties et le flux net affichent maintenant des montants toujours cohérents entre eux.
- **Paramètres** : retire un panneau d'intégrations obsolète qui pouvait afficher un statut de caisse contradictoire avec la vraie carte de connexion POS.
- **Établissement** : le type d'établissement (Restaurant / Café / Hybride) est maintenant configurable et ajuste automatiquement les seuils de rentabilité et de rétention par défaut à votre modèle d'affaires.

## [v2.16.0] - 2026-08-02

### 👥 Masse Salariale en % du Chiffre d'Affaires
- **Overview** : nouvelle carte "Masse salariale du mois", juste sous l'objectif du jour — pourcentage calculé automatiquement à partir des quarts déjà loggés, sans aucune saisie supplémentaire. Passe en alerte (ambre) au-dessus de la cible de 30 % du CA, avec un lien direct vers Horaire pour ajuster.
- **Finance** : la même donnée apparaît dans l'onglet Aperçu, à côté des Entrées / Sorties / Flux net.
- **Recommandations** : une masse salariale trop élevée génère désormais une suggestion concrète ("revoir les horaires de la semaine prochaine"), comme le fait déjà une alerte de stock bas pour les commandes fournisseur.

## [v2.15.0] - 2026-08-02

### 🍽️ Le Lien Manquant : Commande → Inventaire
- **Recettes de Menu** : chaque plat peut maintenant déclarer les articles d'inventaire qu'il consomme (fiche du plat → section « Recette »). Servir une commande décrémente désormais automatiquement le stock correspondant — la promesse « commande = inventaire -1, revenus +X, automatiquement » est enfin tenue de bout en bout, vérifiée en conditions réelles (QR code client → cuisine → stock).
- **Fiabilité** : le revenu du jour et la quantité en stock sont maintenant incrémentés de façon atomique (même mécanisme que les autres compteurs de l'app) — deux commandes servies en même temps ne peuvent plus s'écraser l'une l'autre.

### 🎯 Objectif du Jour sur l'Aperçu
- Le simulateur de seuil de rentabilité (Finance) sauvegarde maintenant ses hypothèses (coûts fixes, marge, panier moyen) — elles survivent au rechargement.
- L'Aperçu affiche « Il te faut N clients aujourd'hui pour être payé », calculé en direct à partir de ces hypothèses, avec la progression du jour.
- Une alerte de stock bas se transforme maintenant en recommandation concrète (« Passer une commande fournisseur ») au lieu d'un simple avertissement.

### 📊 Programmes & Bibliothèque
- **Programmes** : cartes stats (Programmes actifs / Revenu total / Marge moyenne) au-dessus du tableau.
- **Bibliothèque** : en-tête uniformisé avec le reste de l'app ; notification discrète (au lieu d'une boîte de dialogue bloquante) au téléchargement d'un fichier.
- **Calendrier** : hauteur de cellule stabilisée dans la vue mensuelle.

### 💳 Facturation
- L'état « Stripe non configuré » sur `/billing` affiche maintenant une carte « Période pilote gratuite » avec la liste des fonctionnalités incluses, plutôt qu'un simple paragraphe brut.

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
