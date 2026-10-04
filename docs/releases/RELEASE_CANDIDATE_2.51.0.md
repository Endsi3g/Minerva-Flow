# Minerva Flow 2.51.0 — Portail équipe, Compte client, partage de résultats

**Statut : candidat, non publié.** Rien ci-dessous n'est disponible aux utilisateurs tant que le build et le déploiement correspondants n'ont pas été vérifiés (voir « Conditions de sortie »). Aucune entrée du journal des mises à jour n'est publiée, aucun courriel n'est parti.

Date : 2026-10-03 · Branche : `feat/team-portal-and-native-account-uplift` (non poussée)

## Contenu

- **Portail équipe et ambassadeurs** (`/equipe`, web et iOS) : indicateurs internes réservés à l'équipe, entonnoir, objectifs du mois, Académie, profils de membres. Les ambassadeurs ne voient jamais les revenus. Voir `docs/engineering/TEAM_PORTAL.md`.
- **Application iOS client** : Compte en sous-pages (commandes, points, paramètres, aide), Accueil avec statistiques et graphique, carte de fidélité du niveau supérieur en vert, page « Nouveautés » réservée aux changements qui concernent les clients.
- **Journal des mises à jour par audience** : une même source, deux lecteurs (propriétaires, clients). Les entrées existantes restent réservées aux propriétaires.
- **Partager mes résultats** (web) : visuel ou courte vidéo avec les vrais chiffres du restaurant; l'équipe a la même chose pour Minerva Flow. Voir `docs/engineering/SHARE_RESULTS.md`.
- **Réglages web** en sous-pages au lieu d'onglets.
- **Paiement en ligne et versements des ambassadeurs** : l'app iOS ouvre le web.
- **Tags NFC** (lecture client, programmation propriétaire) : **exclus de l'annonce** tant que la capacité n'est pas activée sur l'identifiant d'app (`docs/mobile/NFC_AND_SIGNING.md`).
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
| ESLint global | ÉCHEC préexistant, étape non bloquante en CI |

## Conditions de sortie

1. Parcours authentifiés vérifiés sur un déploiement de prévisualisation (propriétaire, équipe, partage de résultats, Nouveautés vide).
2. Contrôle visuel manuel des écrans iOS sur l'appareil, mode clair et sombre.
3. Capacité NFC activée et profils régénérés, ou NFC explicitement hors de la version.
4. Cron des avis Google réparé ou écarté de la décision.
5. Captures du journal produites; textes d'annonce relus.
6. Courriel de test envoyé à une adresse interne avant tout envoi au segment.

## Ordre de sortie

1. Pousser la branche et ouvrir une pull request en brouillon (CI + prévisualisation).
2. Vérifier la prévisualisation (condition 1).
3. Fusionner : le déploiement web de production suit.
4. Construire et téléverser le build iOS; vérifier le traitement Apple.
5. Vérifier le déploiement de production exact.
6. Publier les entrées du journal (propriétaires, clients) par migration SQL.
7. Envoyer le courriel de test, puis l'annonce au segment.
