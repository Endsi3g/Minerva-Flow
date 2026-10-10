# Paiement Clover — contrôle du 9 octobre 2026

## État

**Non fonctionnel à ce stade.** Aucun paiement Clover ni test de débit n’a été effectué. Le paiement à la réception reste le mode configuré. Ce contrôle ne remplace pas les contrôles web, natifs et stores de la release.

## Décisions confirmées

- Préautoriser le montant de la commande, puis débiter après acceptation par un propriétaire ou gestionnaire autorisé.
- En cas de refus du restaurant, libérer la préautorisation non capturée ou rembourser intégralement les fonds déjà capturés.
- Préserver une relation unique entre restaurant, marchand, commande Minerva Flow, commande Clover et opération financière.

## Contrôles réels effectués

Contrôles en lecture seule à 15:34 UTC; aucun secret Vault n’a été lu.

| Environnement | Résultat |
| --- | --- |
| Staging — `pos_connections`, fournisseur Clover | 0 connexion |
| Production — `pos_connections`, fournisseur Clover | 0 connexion |
| Composio — `CLOVER_GET_MERCHANT` | Aucune connexion Clover active |

Les réponses sont conservées dans `.verify-artifacts/20261009T153400Z-clover-payment/` avec accès privé. Une application déclarée dans le portail développeur et des cases de permission cochées ne prouvent pas l’autorisation d’un marchand.

Kael a confirmé ne pas encore disposer de cette connexion et souhaite terminer d’abord la configuration de l’application dans Clover. La prochaine étape est donc la saisie des justifications et le choix du mode Ecommerce, avant l’autorisation marchand et l’implémentation.

## Étapes nécessaires

1. Autoriser Minerva Flow auprès d’un marchand Sandbox, activer le mode Ecommerce approprié et enregistrer les identifiants dans l’environnement serveur prévu. L’autorisation appartient au titulaire du compte. Le skill Vercel Marketplace exige cette provision réelle avant le développement du paiement.
2. Vérifier le flux OAuth existant, le stockage fiable des jetons et leur renouvellement; aucune opération financière ne doit utiliser un jeton expiré ou une connexion non confirmée.
3. Valider le flux Clover permettant une préautorisation puis une capture avec **une seule** commande associée. `/v1/charges` crée une commande; le schéma de `/v1/orders/{orderId}/pay` ne déclare pas `capture`. Ne pas combiner aveuglément une préautorisation et l’export atomique existant. Le worker actuel est réservé aux commandes payables à la réception et rejette les états de paiement en ligne.
4. Implémenter les références financières durables, les montants serveur, l’accès par restaurant, la saisie de carte hébergée Clover, le traitement des réponses incertaines et la libération ou le remboursement au refus.
5. Tester en Sandbox: préautorisation acceptée et refusée, capture après acceptation, refus avant capture, remboursement après capture, réponses perdues, accès client interdit à la capture, acceptation/refus concurrents et expiration de préautorisation. Vérifier ensuite une commande et un paiement uniques dans le marchand réel de test.
6. Réaliser les contrôles de release requis, configurer le marchand Production autorisé, puis activer le paiement après validation.

## Justifications

Les textes français et anglais sont préparés dans [CLOVER_CHAMPS_A_SAISIR.md](../engineering/CLOVER_CHAMPS_A_SAISIR.md), sections Read payments, Write payments et Ecommerce / Online payments. Ils décrivent la fonction demandée, encore non implémentée.

## Sources officielles

- [Permissions Ecommerce Clover](https://docs.clover.com/dev/docs/ecommerce-app-permissions): la capture exige Read payments, Write payments et Online payments; les permissions de remboursement dépendent de l’endpoint.
- [Paiements et préautorisations](https://docs.clover.com/dev/docs/ecommerce-accepting-payments): `capture=false`, capture ultérieure, création automatique d’une commande par `/v1/charges` et idempotence documentée des charges.
- [Paiement d’une commande existante](https://docs.clover.com/dev/reference/postordersidpay): schéma de requête à valider avec le contrat de préautorisation.
- [Remboursements et annulations](https://docs.clover.com/dev/docs/ecommerce-refunding-payments): opérations distinctes selon le paiement d’origine et son état.
