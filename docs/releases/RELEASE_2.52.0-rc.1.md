# Minerva Flow 2.52.0-rc.1 — Clover et handoff

Préversion de source du 9 octobre 2026, **NOT READY pour Production ou publication dans les stores**.

## Identité et périmètre

- Branche : `release/clover-2.52.0-rc.1`, isolée de l’arbre de travail original.
- Base : `main` au commit `3f92fd3`.
- Version du package et du lockfile : `2.52.0-rc.1`.
- Tag : `v2.52.0-rc.1`, associé au commit candidat.
- Périmètre confirmé : lot Clover, ses dépendances directes, tests et documentation. Les autres travaux web et natifs restent hors de cette préversion.
- [Handoff de reprise](../../HANDOFF.md).

## Changements inclus

- Export après acceptation par le propriétaire : file durable, correspondances produit/format/options, validation des montants et taxes, intention persistée avant écriture et rapprochement des réponses incertaines.
- Association unique restaurant/marchand/environnement/commande, exclusion des exports déjà associés lors de l’import de ventes pour empêcher un double crédit de fidélité ou de chiffre d’affaires.
- Configuration propriétaire, état de transmission et attribution ciblée des employés associés. Activation de l’export et de l’annulation bloquée jusqu’aux essais réels.
- Protection des exports de catalogue : droits propriétaire/gestionnaire et exclusion des brouillons aux prix non confirmés.
- OAuth sécurisé : échange sur l’hôte API, suppression du repli GET avec secret, état lié au compte initiateur et à l’environnement, revalidation des droits et du marchand, jetons expirés refusés, échecs Vault/DB signalés.
- Migrations `0181` et `0182`, déjà appliquées en Staging seulement. Cette livraison GitHub n’applique aucune migration.
- Justifications Clover Customers/Payments/Ecommerce et contrat de paiement restant à implémenter documentés.
- Les préversions et brouillons sont exclus du job d’annonce de release; aucun appel au webhook Production pour ce candidat.

## Contrôles du candidat isolé

| Contrôle | Résultat |
| --- | --- |
| Tests du lot Clover | **PASS — 150 tests, 10 fichiers** |
| Suite unitaire complète | **562 réussites, 8 échecs, 91 fichiers** |
| Comparaison des échecs avec la base inchangée `3f92fd3` | **Les mêmes 8 échecs reproduits**, 17 réussites dans les 2 fichiers concernés |
| TypeScript | **PASS** |
| ESLint des sources sélectionnées | **PASS — 32 fichiers, aucun diagnostic** |
| `git diff --check` | **PASS** |
| Workflow d’annonce | YAML valide; garde préversion/brouillon présent |
| Build Webpack | **PASS — exit 0, 308 pages générées**; relance avec heap Node de 4 Go après un premier arrêt mémoire (SIGABRT) |
| Connexion, Orders/Register et paiement Clover réels | **BLOCKED — aucun marchand autorisé** |
| Nouveaux parcours visuels, web E2E et natifs | Non validés dans ce lot |

Les 8 échecs sont des assertions préexistantes des templates email sur l’orthographe de l’adresse postale dans `campaigns-and-casl-consent.test.ts` et `lifecycle-templates.test.ts`. Ils sont conservés avec leurs preuves; les tests n’ont pas été modifiés pour les masquer. Leurs corrections présentes ailleurs dans l’arbre de travail ne font pas partie du périmètre Clover confirmé. Les 605 tests réussis du lot antérieur concernaient cet arbre de travail plus large, pas le candidat isolé.

Preuves locales privées : `.verify-artifacts/20261009T182000Z-clover-release/`, avec `focused.log`, `full-unit.log`, `baseline-emails.log`, `typescript.log`, `eslint.log` et `build.log`. Aucun jeton ou secret n’est inclus dans la release.

## Reste à implémenter et valider

1. Terminer la configuration développeur Clover puis autoriser un marchand Sandbox compatible Ecommerce.
2. Implémenter le renouvellement distribué des jetons et une persistance atomique; gérer les réponses perdues et les secrets Vault orphelins éventuels.
3. Valider une seule commande Clover pour le parcours préautorisation puis capture; ne pas créer une seconde commande avec l’export atomique.
4. Implémenter préautorisation à la commande, capture après acceptation et libération ou remboursement automatique au refus.
5. Implémenter l’association durable et la création/mise à jour des fiches clients nécessaires, sans double création ni inscription promotionnelle automatique.
6. Tester les refus, expirations, doubles clics, erreurs réseau et opérations concurrentes; vérifier la réception réelle en caisse et l’absence de double fidélité/chiffre d’affaires.
7. Configurer le planificateur, vérifier les parcours et les contrôles de release, puis activer les fonctions et promouvoir seulement après validation.

## Portée de la publication

Cette préversion GitHub met le code et le plan de reprise à disposition. Elle ne certifie pas un paiement fonctionnel, n’active pas l’export Clover, n’est pas un déploiement Production et ne téléverse aucun binaire iOS/Android. L’annonce utilisateurs reste réservée à une version appliquée et validée.
