# Minerva Flow 2.51.0 — Portail équipe, Compte client, partage de résultats

**Statut au 2026-10-05 : code web intégré à `main` et déployé en Production; release produit non publiée.** Le déploiement Vercel associé aux domaines de production est `READY`. La branche du portail équipe a été fusionnée à `main` dans `590ac6c`; les changements de préparation GTM et de diagnostic sont également poussés à `main`. La version de `package.json` demeure `2.50.0`; aucune entrée 2.51 du journal n'est publiée et aucune annonce de cette candidate n'est partie.

Les parcours authentifiés et les écrans iOS restent non vérifiés. Le déploiement web ne vaut pas validation de ces parcours ni disponibilité d'un nouveau build TestFlight. Conserver le statut de lancement sous conditions jusqu'à la clôture des étapes manuelles ci-dessous.

Date de préparation : 2026-10-03 · Branche source : `feat/team-portal-and-native-account-uplift` (fusionnée à `main`)

## Contrôles live du 6 octobre 2026

- **Preview** : le déploiement Ready de `fix/team-login-redirect` (PR #176, basé sur `main` `bfcf613`) sert `/equipe/connexion` en HTTP 200 et la page de connexion s’ouvre dans Safari. Les parcours authentifiés owner, équipe et partage ne sont pas validés faute de session de test.
- **Consentement Resend** : le segment global contient 102 contacts, dont 57 désabonnés; seuls 22 contacts figurent dans le segment actif au consentement explicite et aucun de ces 22 n’est désabonné. Les 45 contacts non désabonnés du segment global ne sont pas tous attestés comme opt-in : ne pas les ajouter à la campagne.
- **Composer / courriel** : brouillon Resend créé et rendu dans l’éditeur, statut `draft`, segment explicite uniquement, expéditeur `Minerva Flow <flow@minervaflow.app>`; domaine `minervaflow.app` vérifié. ID du brouillon `73a16f1d-617b-46be-b536-98e281593c88`. Aucun courriel de test ou campagne n’a été envoyé.
- **iOS** : le garde-fou statique retourne 0 critique, 0 élevé, 1 avertissement manuel; les deux manifests de confidentialité sont valides. App Store Connect ne montre que le build TestFlight 1.0.0 (15), en cours de test; le build 1.0.1 (16) n’est pas téléversé. La version App Store 1.0 est « À finaliser avant soumission » : les déclarations App Privacy ne sont pas commencées, l’URL de confidentialité est vide, les captures iPhone sont à 0/10 et les identifiants de démonstration pour la revue sont vides. La fiche affiche aussi l’avis de statut professionnel UE à confirmer. Aucun achat intégré n’est configuré; le code indique que les abonnements sont gérés sur le web. La suppression de compte existe dans le code, mais son parcours n’a pas été validé sur l’artefact distribué.
- **Décision** : ne pas envoyer à toute la base ni publier la release tant que le test email, les parcours Preview authentifiés et les contrôles App Store manuels ne sont pas clos. Le brouillon reste non envoyé.

## Contenu

- **Portail équipe et ambassadeurs** (`/equipe`, web et iOS) : indicateurs internes réservés à l'équipe, entonnoir, objectifs du mois, Académie, profils de membres. Les ambassadeurs ne voient jamais les revenus. Voir `docs/engineering/TEAM_PORTAL.md`.
- **Application iOS client** : Compte en sous-pages (commandes, points, paramètres, aide), Accueil avec statistiques et graphique, carte de fidélité du niveau supérieur en vert, page « Nouveautés » réservée aux changements qui concernent les clients.
- **Journal des mises à jour par audience** : une même source, deux lecteurs (propriétaires, clients). Les entrées existantes restent réservées aux propriétaires.
- **Partager mes résultats** (web) : visuel ou courte vidéo avec les vrais chiffres du restaurant; l'équipe a la même chose pour Minerva Flow. Voir `docs/engineering/SHARE_RESULTS.md`.
- **Réglages web** en sous-pages au lieu d'onglets.
- **Paiement en ligne et versements des ambassadeurs** : l'app iOS ouvre le web.
- **Tags NFC** (lecture client, programmation propriétaire) : exclus du périmètre de la release 2.51 et de toute annonce; la capacité n'est pas vérifiée sur un appareil (`docs/mobile/NFC_AND_SIGNING.md`).
- Base de données : migrations `0168` à `0173`, déjà appliquées en production.

## Brouillons d'annonce (non publiés)

Texte volontairement simple, sans jargon. À relire et à valider avant toute publication.

**Propriétaires** — *Partagez vos résultats en un geste*

- Créez un visuel ou une courte vidéo avec vos vrais chiffres : nouveaux membres, clients revenus, commandes servies, note moyenne. Vous choisissez ce qui s'affiche, puis vous publiez sur vos réseaux.
- Vos réglages sont rangés en pages claires : alertes, parrainage, sécurité, apparence.
- Dans l'application iOS, retrouvez toutes les mises à jour dans Gestion › Mises à jour.

**Clients** — *Votre compte, plus clair*

- Votre compte est rangé en pages : vos commandes, vos points, l'aide.
- Votre accueil montre vos points récents d'un coup d'œil.
- Retrouvez ici, dans Nouveautés, ce qui change pour vous.

Les captures d'écran du journal sont **à produire** à partir de l'application réelle avec des données réelles ou clairement étiquetées « exemple » : le formulaire d'administration exige une capture par entrée.

## Destinataires

- Annonce par courriel : uniquement le segment Resend des contacts choisis à la main qui ont explicitement accepté les annonces (22 contacts lors de la 2.50.0). **Ne pas reconstruire la liste à partir de `profiles.product_updates_opt_in`** : ces 102 drapeaux proviennent d'une attestation en bloc du 23 septembre (source `external_consent_attested_by_account_owner`), dont une majorité d'adresses de test.
- Les entrées destinées aux clients ne déclenchent aucune notification ni courriel aux restaurants (`announceChangelogEntry`, testé). Il n'existe pas de canal de notification vers les clients dans ce flux : ils voient l'entrée dans Compte › Nouveautés.
- Attention : publier une release GitHub déclenche automatiquement une notification à tous les membres de restaurants et un courriel au segment (`/api/system/publish-release`). Publier une entrée par migration SQL, comme pour les versions précédentes, n'annonce rien.

## Vérifications

| Contrôle | Résultat |
| --- | --- |
| TypeScript (`npx tsc --noEmit`) | PASS |
| Tests web (`npx vitest run`, délai de test 60 s) | PASS — 396 tests dans 72 fichiers (avec le délai par défaut, un test Stripe est instable à l'import à froid) |
| CI GitHub de la PR #167 (typage, lint non bloquant, tests, build) | PASS — deux exécutions |
| Déploiement de prévisualisation Vercel | PASS — `/equipe/connexion` répond et s’ouvre; parcours authentifiés toujours non vérifiés |
| Tests natifs ciblés (NFC, Nouveautés) | PASS — 7 tests |
| Build iOS simulateur et appareil | PASS |
| Audit App Store (`native/ios`) | 0 critique, 0 élevé, 1 avertissement manuel; App Store Connect reste incomplet |
| Consentement Resend (6 octobre) | 22 opt-ins explicites actifs; 57 désabonnés dans le segment global; campagne brouillon seulement |
| App Store Connect (6 octobre) | Build 15 seulement; build 16 absent; fiche « À finaliser avant soumission » |
| Rendu visuel et vidéo du partage (navigateur sans interface) | PASS — voir `docs/engineering/SHARE_RESULTS.md` |
| Parcours authentifiés (propriétaire, `/equipe`, partage) sur le build déployé | **NON VÉRIFIÉ** — aucune session accessible |
| Rendu visuel des écrans iOS | **NON VÉRIFIÉ** — à contrôler à la main sur l'appareil |
| NFC sur appareil | **NON VÉRIFIÉ** — profil de signature sans la capacité |
| Automation de publication | **EN ÉCHEC** — le workflow v2.50.0 s'est terminé avec HTTP ≥400 avant l'écriture de l'entrée; la cause n'est pas confirmée. Les journaux Vercel n'ont pas fourni le détail. Le workflow capture maintenant le statut et la réponse lors d'un prochain appel; aucun nouveau webhook n'a été déclenché.
| Cron Google Reviews | **EN ÉCHEC** — les exécutions planifiées des 1–5 octobre ont toutes échoué avec HTTP ≥400; l'ancien workflow masquait le statut et le corps. Le workflow capture maintenant la réponse d'erreur; le cron reste un incident d'exploitation séparé.
| ESLint global | ÉCHEC préexistant, étape non bloquante en CI |

## Conditions de sortie

1. Parcours authentifiés vérifiés sur un déploiement de prévisualisation (propriétaire, équipe, partage de résultats, Nouveautés vide).
2. Contrôle visuel manuel des écrans iOS sur l'appareil, mode clair et sombre.
3. [x] NFC explicitement hors du périmètre de la version et de la communication.
4. [x] Cron des avis Google explicitement exclu des promesses et de la communication de 2.51. L'incident d'exploitation reste à diagnostiquer séparément.
5. Captures du journal produites; textes d'annonce relus.
6. Courriel de test envoyé à une adresse interne avant tout envoi au segment.

## Ordre de sortie

1. [x] Pousser la branche, ouvrir la PR et fusionner dans `main` (déjà intégré).
2. Vérifier les parcours authentifiés sur Preview; toujours requis.
3. [x] Déployer le web en Production; déploiement actuel `READY`.
4. Construire et téléverser le build iOS; vérifier le traitement Apple et les parcours sur appareil.
5. [x] Vérifier le domaine et l'état du déploiement web de Production.
6. Produire les captures, puis publier les entrées du journal par audience.
7. Envoyer le courriel de contrôle interne, puis l'annonce au segment explicitement inscrit.
8. Diagnostiquer l'échec HTTP du webhook de publication avant de créer la prochaine GitHub Release; ne pas le relancer tant que les contrôles ci-dessus ne sont pas prêts.
