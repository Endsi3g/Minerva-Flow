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

## Livraison

À compléter après publication : SHA du commit, URL/ID du déploiement Production, état des smoke checks, tag GitHub, état du workflow d’annonce et résultat du broadcast consentant.

La recommandation de release est `READY WITH CONDITIONS` tant que le parcours Owner authentifié n’a pas été vérifié avec une session de staging. Le déploiement demandé par le propriétaire peut être effectué; cette limitation doit rester visible.
