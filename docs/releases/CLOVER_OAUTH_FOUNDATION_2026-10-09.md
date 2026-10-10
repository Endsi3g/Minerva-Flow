# Clover — premiers correctifs de connexion, 9 octobre 2026

Ce rapport décrit le lot local avant isolation. La préversion de source qui le contient est `2.52.0-rc.1`; consulter [ses notes](RELEASE_2.52.0-rc.1.md) pour les résultats du candidat isolé, son tag et sa livraison GitHub. Les totaux de tests ci-dessous ne sont pas ceux de ce candidat.

## Périmètre et identité

- Vérifié à 15:49 UTC sur l’arbre de travail local, base `main`, commit `3f92fd3`, avec les modifications existantes conservées.
- Aucun commit, déploiement, migration distante, paiement ou email effectué pour ce lot.
- Ce lot corrige l’intégration existante pour préparer l’autorisation marchand. Il ne crée pas de checkout, de paiement fictif ou de synchronisation Customers.

## Changements

- Échange du code par un unique POST sur l’hôte API Clover, suppression du repli GET exposant le secret dans l’URL; hôte d’autorisation Production corrigé sur `www.clover.com`.
- Échange et vérification du marchand : timeout 15 secondes, sans cache, redirections interdites, validation de la réponse. L’identifiant marchand doit correspondre exactement.
- État signé lié au compte initiateur, au restaurant, au fournisseur et à l’environnement. Le callback exige la session du compte initiateur et un rôle propriétaire/gestionnaire actif; rôle et restaurant sont relus avant le stockage.
- Le code ne renvoie plus un jeton expiré sous prétexte qu’un refresh token existe. Le renouvellement durable reste à développer; une reconnexion est nécessaire après expiration.
- Vérification des erreurs Vault et DB avant d’annoncer une connexion réussie. La connexion manuelle renvoie un échec récupérable en cas d’erreur de stockage et revalide les droits après l’appel marchand.
- Les connexions Clover non marquées `connecte` ne fournissent plus de jeton à l’API.

Les contrôles d’erreur de `savePosConnectionTokens` sont partagés par les cinq fournisseurs POS; les tests couvrent leur persistance normale. La vérification du statut avant lecture du jeton reste spécifique à Clover.

## Contrôles automatisés

| Contrôle | Résultat | Preuve privée |
| --- | --- | --- |
| Vitest ciblé, 5 fichiers | PASS — 77 tests | `focused.log` |
| Vitest complet | PASS — 605 tests, 98 fichiers | `full-unit.log` |
| `tsc --noEmit` | PASS — exit 0 | `typescript.log` |
| ESLint, 11 fichiers concernés | PASS — exit 0, aucun diagnostic | `eslint.log` |
| `git diff --check`, fichiers concernés | PASS | `checks.json` |
| Nouveau build | NON EXÉCUTÉ | Le build précédent appartient au lot antérieur |

Preuves conservées sous `.verify-artifacts/20261009T154951Z-clover-oauth-foundation/`. Les tests de fournisseur utilisent des réponses contrôlées et ne prouvent pas une autorisation ou un paiement réel.

## Parcours et livraison

| Parcours | Local automatisé | Marchand / déploiement réel |
| --- | --- | --- |
| Lancement par propriétaire/gestionnaire | PASS, unité | BLOCKED |
| Retour par client, autre compte, restaurant ou environnement | Refus vérifié, unité | BLOCKED |
| Droits retirés pendant la connexion | Refus vérifié, unité | BLOCKED |
| Marchand différent ou erreur de stockage | Échec vérifié, unité | BLOCKED |
| Paiement / capture / remboursement | Non implémenté | BLOCKED |
| Création / mise à jour de clients Clover | Non implémenté | BLOCKED |
| Rendu web, iOS et Android de ce lot | Non exécuté | Non exécuté |

Aucune capture visuelle ou trace de paiement disponible : ces parcours n’ont pas été effectués. Ne pas assimiler les tests unitaires aux parcours E2E ou natifs restants de la release.

## Limites et prochaine reprise

**NOT READY.** Kael termine d’abord l’application Clover; aucun marchand n’est encore autorisé. Le skill Vercel Marketplace exige cette provision avant de développer le nouveau paiement.

Après autorisation : mettre en place une rotation durable des jetons avec coordination interprocessus, transaction des secrets et du statut et traitement des réponses perdues. Le stockage actuel peut laisser un secret Vault orphelin si une écriture ultérieure échoue; les tests n’affirment pas une atomicité absente. Un OAuth commencé avant ce correctif a un état non lié au compte et devra être relancé.

Valider ensuite une seule commande Clover pour la préautorisation/capture, implémenter les opérations financières et fiches clients prévues, puis vérifier les parcours réels en Sandbox et sur Preview. Le [plan complet est dans HANDOFF.md](../../HANDOFF.md).

Les blocages E2E, natifs et consoles de la release restent distincts de ce lot et ne sont pas considérés résolus.

## Documentation de référence

- [Clover v2 OAuth : hôtes et échange des codes](https://docs.clover.com/dev/docs/generate-expiring-tokens-using-v2-oauth-flow).
- [Rotation, usage unique et récupération des refresh tokens](https://docs.clover.com/dev/docs/refresh-access-tokens).
- [Préparation du paiement et critères réels](CLOVER_PAYMENT_READINESS_2026-10-09.md).
