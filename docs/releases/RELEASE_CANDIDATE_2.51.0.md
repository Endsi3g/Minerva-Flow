# Minerva Flow 2.51.0 — Portail équipe, Compte client, partage de résultats

**Statut au 2026-10-06 : correctifs web `a2600d6` déployés et vérifiés en Production.** Les routes authentifiées renvoient les 14 adhésions nommées, la fiche restaurant, l’image de marque et un code QR résolu correctement. Le build iOS `1.0.1 (19)` est installé sur l’iPhone 13 et téléversé; son dernier état connu chez Apple était « en traitement ». L’adresse officielle complète est « 367 rue Lberge, Repentigny (Québec) J6A 4C2, Canada », sans suite, et le téléphone (514) 451-5232. Les coordonnées sont complètes; CGV et pied de page de l’annonce seront déployés avec ce commit. Le broadcast reste en brouillon jusqu’au contrôle final du contenu et du segment de consentement.

Les routes corrigées, l’accès aux données client existantes et la compilation iOS sont vérifiés. Les parcours authentifiés propriétaire/équipe/partage et le nouvel onboarding QR complet n’ont pas été validés de bout en bout sur Preview; le build TestFlight attend le traitement Apple. Conserver le lancement sous conditions jusqu’aux contrôles manuels ci-dessous.

Date de préparation : 2026-10-03 · Branche source : `feat/team-portal-and-native-account-uplift` (fusionnée à `main`)

## Avancement des corrections du 6 octobre

- L'écran iOS de connexion est recentré; « Flow » reste noir, le nom français emploie l'italique de la police d'affichage, le bypass de développement a disparu de l'interface et le consentement marketing commence décoché.
- L’app impose la liaison à un restaurant par QR uniquement aux comptes sans adhésion. Le compte de démonstration réel se connecte et possède 14 adhésions; ses noms, son historique et l’image de marque sont servis correctement. Un parcours QR de nouvel utilisateur doit encore être testé avec un compte sans adhésion.
- La migration Supabase `0179_resolve_restaurant_connection_token` est appliquée et inscrite dans l’historique Production. La route de résolution QR utilise le RPC sous RLS.
- Les CGV commerciales FR/EN sont rédigées avec l’essai de 14 jours, les prix, taxes selon la loi, renouvellement, résiliation à la fin de la période payée et absence de remboursement après débit, sous réserve des droits impératifs et des débits erronés. L’adresse officielle complète, sans suite, et le téléphone (514) 451-5232 sont confirmés; la page sera publiée avec ce commit.
- Build iOS `1.0.1 (19)` compilé, archivé et téléversé; le dernier état confirmé par App Store Connect était « Uploaded package is processing ». Le build Debug 19 est installé et lancé sur l’iPhone 13. La disponibilité TestFlight n’a pas été re-vérifiée depuis le téléversement.
- Build web et TypeScript réussissent; les tests ciblés des routes restaurant et QR réussissent (7/7). En Production authentifiée, `/api/portal/restaurants`, `/api/portal/restaurant`, `/api/portal/restaurant/[id]/branding` et la résolution d’un QR valide répondent tous 200; les 14 adhésions portent un nom. La tournée UI complète et les parcours owner/équipe/partage en Preview restent à faire.
- Le nouvel email de contrôle à `kbelceus776@gmail.com` a été livré. L’aperçu HTML local mobile et bureau est lisible. Le brouillon Resend détaillé reste `draft`, limité au segment des 22 consentements explicites actifs; aucune annonce de release n’a été envoyée.

## Contrôles live du 6 octobre 2026

- **Preview** : le déploiement Ready de `fix/team-login-redirect` (PR #176, basé sur `main` `bfcf613`) sert `/equipe/connexion` en HTTP 200 et la page de connexion s’ouvre dans Safari. Les parcours authentifiés owner, équipe et partage ne sont pas validés faute de session de test.
- **Consentement Resend** : le segment global contient 102 contacts, dont 57 désabonnés; seuls 22 contacts figurent dans le segment actif au consentement explicite et aucun de ces 22 n’est désabonné. Les 45 contacts non désabonnés du segment global ne sont pas tous attestés comme opt-in : ne pas les ajouter à la campagne.
- **Composer / courriel** : brouillon Resend détaillé, statut `draft`, segment explicite uniquement, expéditeur `Minerva Flow <flow@minervaflow.app>`; domaine vérifié. Le test interne actualisé est livré. ID du brouillon `73a16f1d-617b-46be-b536-98e281593c88`. Le pied de page reprend l’adresse officielle complète (sans suite), le téléphone, le site et l’adresse de soutien; contrôle final du segment et envoi après déploiement.
- **iOS** : le garde-fou statique retourne 0 critique, 0 élevé, 1 avertissement manuel. Build `1.0.1 (19)` accepté par le transport et en traitement Apple; app Debug 19 installée et ouverte sur l’iPhone 13. La fiche App Store 1.0 demeure « À finaliser avant soumission » : déclarations App Privacy, captures et identifiants d’examen restent manuels. Aucun achat intégré n’est configuré; les abonnements sont gérés sur le web.
- **Décision** : les contacts non attestés et désabonnés restent exclus. L’adresse postale est complète et confirmée; après déploiement et dernière vérification live du brouillon, envoyer uniquement aux contacts explicitement opt-in. L’annonce est encore non envoyée.

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
| Corrections du 6 octobre | TypeScript PASS; build web PASS; tests de routes ciblés 7/7 PASS; routes authentifiées Production 200; build iOS Debug et archive Release 1.0.1 (19) PASS; migration 0179 appliquée; onboarding QR neuf encore à vérifier |
| CI GitHub de la PR #167 (typage, lint non bloquant, tests, build) | PASS — deux exécutions |
| Déploiement de prévisualisation Vercel | PASS — `/equipe/connexion` répond et s’ouvre; parcours authentifiés toujours non vérifiés |
| Tests natifs ciblés (NFC, Nouveautés) | PASS — 7 tests |
| Build iOS simulateur et appareil | PASS |
| Audit App Store (`native/ios`) | 0 critique, 0 élevé, 1 avertissement manuel; App Store Connect reste incomplet |
| Consentement Resend (6 octobre) | 22 opt-ins explicites actifs; 57 désabonnés dans le segment global; campagne brouillon seulement |
| App Store Connect (6 octobre) | Build 19 téléversé, en traitement; fiche « À finaliser avant soumission » |
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
