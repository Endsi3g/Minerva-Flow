# Minerva Flow 2.51.0 — Portail équipe, Compte client, partage de résultats

**Statut au 2026-10-05 : code web intégré à `main` et déployé en Production; release produit non publiée.** Le déploiement Vercel associé à `www.minervaflow.app` est `READY` (`dpl_9pnm1NhxshWXv7gfobeMayeVdbqZ`). `main` et `origin/main` sont au commit `81c1ec8`; le merge de la branche du portail équipe est `590ac6c`. La version de `package.json` demeure `2.50.0`; aucune entrée 2.51 du journal n'est publiée et aucune annonce de cette candidate n'est partie.

Les parcours authentifiés et les écrans iOS restent non vérifiés. Le déploiement web ne vaut pas validation de ces parcours ni disponibilité d'un nouveau build TestFlight. Conserver le statut de lancement sous conditions jusqu'à la clôture des étapes manuelles ci-dessous.

Date de préparation : 2026-10-03 · Branche source : `feat/team-portal-and-native-account-uplift` (fusionnée à `main`)

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
| Déploiement de prévisualisation Vercel | PASS — déployé; non testé depuis cette session (accès réseau et session indisponibles) |
| Tests natifs ciblés (NFC, Nouveautés) | PASS — 7 tests |
| Build iOS simulateur et appareil | PASS |
| Audit App Store (`native/ios`) | 0 critique, 0 élevé, 3 moyens |
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
