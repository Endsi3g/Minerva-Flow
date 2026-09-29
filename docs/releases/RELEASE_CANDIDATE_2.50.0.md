# Minerva Flow 2.50.0 — Recommandations explicables

Date : 2026-09-29

Branche : `main`

## Contenu

- Flow AI présente des conseils vérifiables, rangés par domaine, avec fraîcheur et provenance des données. Les estimations non étayées (confiance en pourcentage et gains promis) sont retirées; les scénarios de marge montrent leurs hypothèses.
- Les recommandations menu, stock et fidélité invitent le propriétaire à vérifier ou configurer les données manquantes. Elles ne modifient pas les réglages à sa place.
- La page Valeur client affiche séparément la LTV revenu, la LTV marge estimée et leur somme, ainsi que le CAC sur les catégories publicité, commissions, agence, promotions et équipement. Les résultats incomplets restent signalés comme à confirmer.
- Les courriels du journal de versions utilisent le segment Resend des contacts actifs ayant explicitement accepté les annonces produit, avec désabonnement et adresse postale. L’annonce dans l’application reste indépendante du consentement marketing.

Captures illustratives construites avec des données synthétiques : [recommandations ordinateur](../../docs/screenshots/recommendations-menu-desktop-2026-09-28.png) · [recommandations mobile](../../docs/screenshots/recommendations-menu-mobile-2026-09-28.png).

## Vérifications avant livraison

| Contrôle | Résultat |
| --- | --- |
| TypeScript (`npx tsc --noEmit`) | PASS |
| Tests ciblés | PASS — 19 tests |
| Tests complets (`npm test -- --run`) | PASS — 348 tests dans 65 fichiers |
| ESLint sur les fichiers modifiés | PASS |
| ESLint global | ÉCHEC préexistant — 511 erreurs et 21 093 avertissements sur le dépôt et les artefacts générés |
| Build production (`npm run build`) | PASS — 355 routes générées |
| `git diff --check` | PASS |
| Parcours Owner authentifié sur staging | BLOQUÉ — aucun navigateur/session Owner n’était accessible dans cette session |
| Smoke Production | PASS — `/fr/login`, `/en/login` et le manifeste répondent 200; les routes authentifiées redirigent vers la connexion |
| Inspection visuelle réelle en navigateur | BLOQUÉE — navigateur interactif indisponible; les captures du dépôt sont des aperçus synthétiques, pas des captures de Production |

## Livraison

Commit de code livré : `b6b069288e59bca07da3de67f85368532d6aa56f` (`main`); le dossier de release est au commit `21da60d6b04c2caa83871dd8bcd1661daac4a916`. Le déploiement Vercel Production du code `dpl_FgQPXkfKNPibTiydqBzdF4riTPPw` est `READY`; après le commit de dossier, `dpl_3NaVU6DyjDcVu1bB6iPebD6dLvFH` est aussi `READY` sur `main`. Les routes de connexion répondent 200 sur `https://minervaflow.app`.

La release GitHub [v2.50.0](https://github.com/Endsi3g/Minerva-Flow/releases/tag/v2.50.0) est publiée avec les captures ordinateur et mobile. Son workflow automatique a échoué sur HTTP 500 avant de créer l’entrée de changelog; une lecture seule de la base a confirmé l’absence de ligne. L’entrée a ensuite été créée une fois dans le journal de l’application et vérifiée en production (ID `d8d250f5-9e3e-4c1c-9e61-4d45eb33fd51`).

Le broadcast automatisé n’ayant pas été créé, l’annonce a été envoyée manuellement par Resend au segment des 22 contacts actifs ayant explicitement accepté les annonces produit. État Resend : `sent`, le 2026-09-29 à 14:34 UTC; désabonnement et adresse postale inclus. L’action automatique GitHub → journal/notifications doit être diagnostiquée avant la prochaine release. Cette réparation de l’entrée de journal n’a pas ré-envoyé l’annonce et n’a pas déclenché une notification push.

La recommandation de release est `READY WITH CONDITIONS` tant que le parcours Owner authentifié n’a pas été vérifié avec une session de staging. Le déploiement demandé par le propriétaire peut être effectué; cette limitation doit rester visible.
