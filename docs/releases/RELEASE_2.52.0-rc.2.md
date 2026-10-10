# Minerva Flow 2.52.0-rc.2 — Tests email et annonce par courriel uniquement

Préversion de source du 9 octobre 2026. **NOT READY pour Production et les stores.** Succède à `v2.52.0-rc.1` sans déplacer ce tag.

## Changements

- Les huit échecs des tests de campagnes et de cycle de vie sont corrigés : leurs assertions utilisent « 367 rue Lberge », l’adresse confirmée et déjà utilisée par l’identité email. Les templates de Production n’ont pas été modifiés pour contourner ces assertions.
- Le nettoyage des types de mocks et de l’import inutilisé conserve les vérifications CASL, consentement et désabonnement.
- Le webhook GitHub annonce désormais par **courriel uniquement**, sans notification dans l’app ni push. La publication admin manuelle conserve ses canaux existants.
- Le résultat de campagne est propagé. En cas d’échec, le webhook retourne HTTP 502 et l’identifiant de l’entrée déjà créée; consulter le fournisseur avant toute reprise, sans création ou renvoi aveugle.
- Kael a confirmé que l’annonce attend la **validation et le déploiement Production**. La garde de préversion reste active et cette publication n’envoie aucun courriel utilisateurs.

## Vérification du candidat isolé

| Contrôle | Résultat |
| --- | --- |
| Deux fichiers anciennement défaillants | **PASS — 25 tests** |
| Suite complète finale | **PASS — 574 tests, 91 fichiers, aucun échec** |
| Annonce courriel uniquement et refus de faux succès | Quatre nouveaux tests inclus dans la suite complète |
| ESLint des six fichiers TypeScript modifiés | **PASS — aucun diagnostic** |
| ESLint de tout le candidat | **FAIL — 201 erreurs et 216 avertissements hors des fichiers corrigés; dette restante** |
| TypeScript | **PASS — exit 0** |
| Build Webpack | **PASS — exit 0, 308 pages générées, heap Node de 4 Go** |
| Git / YAML | **PASS — diff sans erreur et YAML valide, garde préversion conservée** |
| Marchand, caisse et paiement Clover réels | **BLOCKED — autorisation et implémentation restantes** |
| Envoi utilisateur | Attente Production validée; aucun envoi pour cette préversion |

Les 562 réussites et 8 échecs de rc.1 restent des résultats historiques conservés. Les modifications non liées du workspace original ne sont pas incluses dans ce candidat.

## Suite et preuves

- Branche : `release/clover-2.52.0-rc.2`, base `a48e06c`; version package/lockfile et tag `2.52.0-rc.2` / `v2.52.0-rc.2`.
- [Handoff et plan Clover](../../HANDOFF.md) : autoriser un marchand Sandbox, implémenter renouvellement/stockage atomique, fiches clients et préautorisation/capture/remboursement; valider les parcours et la caisse avant activation.
- Preuves locales privées : `.verify-artifacts/20261009T201455Z-email-baseline-fix/` (journaux des tests, types, lint, build et CI). Aucun secret ou donnée client n’est publié.

## Contrôle Clover dans Safari

Safari a été consulté en lecture le 9 octobre : l’application reste DRAFT, avec les étapes URL, permissions, webhooks, icône, liens légaux et captures marquées incomplètes. La tarification est marquée complète. Le type affiché « Android & Web » diffère du type Web prévu pour cette intégration serveur; aucun APK Clover adapté n’est validé. L’inventaire des navigateurs contrôlables est vide et aucune configuration n’a été enregistrée par l’agent. Le skill computer-use demande un navigateur connecté pour modifier un site.

Cette release GitHub est une livraison de code. Elle n’est pas un déploiement Production, n’applique pas les migrations Production, ne téléverse pas de binaire et ne certifie aucun paiement Clover fonctionnel.
