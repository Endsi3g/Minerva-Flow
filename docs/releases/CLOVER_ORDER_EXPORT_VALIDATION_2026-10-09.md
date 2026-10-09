# Clover — contrôles du 9 octobre 2026

Ce rapport décrit la vérification locale antérieure à l’isolation du lot. Le code est désormais préparé dans la préversion `2.52.0-rc.1`; les [notes de préversion](RELEASE_2.52.0-rc.1.md) font foi pour son état GitHub et ses contrôles propres.

## Résultat: NOT READY pour activation ou production

Le code est local et non commité, sur `main` à partir de `3f92fd3`, avec les changements existants conservés. La Preview historique est `dpl_Hi3bdu4n2Kv6gGUTSzJB4cqwpXPn`; elle ne contient pas cette nouvelle intégration.

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Suite locale complète | PASS — 537 tests, 94 fichiers | `.verify-artifacts/20261008T204459Z/clover-order-export-full-unit.log` |
| TypeScript | PASS | `clover-order-export-tsc.log` |
| ESLint fichiers contrôlés | PASS — aucun diagnostic | `clover-order-export-lint.log` |
| Build Next.js | PASS — terminé, cache filesystem long | `clover-order-export-build.log` |
| Scénario SQL Staging | PASS des assertions; schéma conservé par COMMIT intermédiaire corrigé | `clover-order-stage-rollback.json` |
| État final Staging | PASS — migrations 0181/0182, 0 fixture, 0 file, 0 export activé, approbateur ON DELETE SET NULL | `clover-stage-final-state.json` |
| Marchand Clover | BLOCKED — aucune connexion active | `clover-merchant-order-feature-recheck.json` |
| Orders/Register, impression et annulation | BLOCKED — pas de marchand réel | Aucune preuve de réception |
| UI et parcours natifs de la nouvelle intégration | NON VALIDÉS | Le build et les tests unitaires ne prouvent pas ces interactions |
| Production | NON MODIFIÉE | Aucun déploiement ni écriture de données Production |

Les preuves sont dans le dossier ignoré `.verify-artifacts/20261008T204459Z`. La mention « all rolled back » du résultat SQL initial est incorrecte pour le DDL: un COMMIT provenant de la fonction copiée a conservé le schéma avant le rollback des fixtures. La lecture après essai l’a révélé; le fichier est corrigé, le schéma est enregistré dans l’historique des migrations et les contrôles finaux sont conservés. Aucun restaurant réel n’a été activé.

## Conditions d’activation

Autoriser le marchand sandbox dans l’application Minerva Flow, corriger et vérifier OAuth/rotation/persistance, enregistrer le type de commande et les correspondances produit/format, déployer une Preview, vérifier les parcours propriétaire web/iOS/Android puis une réception réelle dans Orders/Register. Valider la suppression d’une commande impayée, sa concurrence avec le paiement et les réponses perdues avant d’ouvrir l’annulation automatique. Ne pas considérer création comme paiement ou impression; Clover Dining n’est pas validé.

Enregistrer ensuite le schedule du worker et ouvrir les flags de validation uniquement pour l’environnement contrôlé. Le passage Production reste soumis aux échecs E2E et contrôles natifs/consoles déjà documentés dans les rapports de release précédents.
