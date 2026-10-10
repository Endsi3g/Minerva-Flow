# Clover — commandes de l’app, puis paiement en ligne

## Choix confirmés le 9 octobre 2026

- Application publique pour les restaurateurs Minerva Flow.
- Écriture du catalogue et des stocks souhaitée depuis l’espace de gestion.
- Priorité suivante: transmettre les commandes de l’app à la caisse Clover, après la connexion réelle du marchand.
- Le paiement à la réception reste le seul mode configuré. Kael demande maintenant l’implémentation du paiement en ligne : préautorisation à la commande, capture après acceptation et remboursement automatique si le restaurant refuse après capture. Avant capture, libérer la préautorisation.
- Le propriétaire accepte la commande dans Minerva Flow; cette acceptation déclenche son export vers Clover. Une commande refusée n’est pas exportée.

Cette page prépare les fonctions à réaliser et les justifications correspondantes. Elle ne certifie pas leur implémentation, leur activation ni l’approbation des permissions par Clover.

## Implémentation locale et état réel — 9 octobre 2026

- File persistante `clover_order_exports`, association marchand/environnement/restaurant/commande, snapshot des données approuvées, verrou distribué et intention d’envoi avant le POST.
- Validation des correspondances explicites par produit et format, des options appartenant au produit Clover, puis comparaison exacte du sous-total, des taxes et du total de l’Atomic Checkout avant création.
- Quantités fixes représentées par des lignes unitaires; aucun usage incorrect de `unitQty` pour ces produits. Notes et format sont conservés en base et dans la demande.
- Réponse perdue, erreur après intention ou absence à la recherche: maintien à vérifier, jamais de création aveugle supplémentaire. La recherche est bornée; ne pas trouver de résultat ne prouve pas un échec de création.
- Déduplication des imports par identifiant Clover ou référence Minerva Flow, avant fidélité, inventaire et chiffre d’affaires; une panne de lecture de l’association bloque l’import.
- Attribution employé demandée: lecture de l’employé référencé uniquement, enregistrement sur la commande d’origine et affichage propriétaire web. Aucun accès paie/horaire ni modification d’employé.
- Annulation automatique demandée: intention durable et rapprochement après réponse perdue. Le DELETE reste désactivé avant les essais réels; les commandes avec paiement exigent une revue et aucun remboursement n’est déclenché.
- Configuration propriétaire web ajoutée; activation refusée côté serveur tant que les flags de validation ne sont pas ouverts. Les frais de livraison, pourboires et modes de paiement en ligne non représentés sont bloqués, jamais supprimés silencieusement.

**Vérification:** 537 tests unitaires/94 fichiers, TypeScript, ESLint des fichiers contrôlés et build passent. Le scénario SQL Staging couvre acceptation propriétaire, refus d’usurpation par employé, snapshot, unicité, ancien verrou, intention unique et annulation. Un COMMIT intermédiaire du premier script d’essai a conservé le schéma; il a été retiré du fichier local. Le contrôle final confirme zéro restaurant de contrôle, zéro commande en file et zéro export activé. Les migrations 0181/0182 sont enregistrées sur Staging; 0182 conserve la suppression d’un compte approbateur grâce à ON DELETE SET NULL.

**Non validé / NOT READY:** aucun marchand Clover connecté, pas de réception réelle Orders/Register, ni impression, ni annulation testée face à un paiement concurrent. Le renouvellement OAuth v2 et la persistance des jetons restent à corriger/valider. Le nouveau code n’est pas déployé sur Preview ou Production, et le cron `/api/cron/clover-order-export` n’a pas de schedule enregistré dans `vercel.json`. Ces résultats locaux ne remplacent ni les parcours web E2E ni les parcours natifs et consoles de publication restant ouverts.

Les flags `CLOVER_ORDER_EXPORT_VALIDATED` et `CLOVER_AUTOMATIC_CANCELLATION_VALIDATED` doivent rester absents ou différents de `1` avant les preuves réelles. Les données et secrets d’un marchand ne doivent jamais être ajoutés à ce document.

## Phase 1 — connexion et catalogue

Achever la configuration développeur et l’autorisation du marchand, réparer et vérifier le renouvellement OAuth, puis tester imports et écritures avec un marchand sandbox. La connexion d’un compte dans Composio et l’installation de l’application Minerva Flow par un marchand sont deux connexions distinctes.

Le code de synchronisation lancé depuis l’app vérifie désormais un rôle propriétaire/gestionnaire actif pour le restaurant. Les articles dont `is_draft` n’est pas explicitement faux ne sont pas exportés. Le compteur rapporte les écritures réussies. Ces changements locaux doivent encore être déployés sur Preview et validés avec Clover.

## Phase 2 — commande Minerva Flow vers Clover

### Contrat fonctionnel à implémenter

- La commande Minerva Flow conserve son identifiant, ses articles, formats, notes et montants validés par le serveur.
- Une relation durable associe restaurant, marchand Clover, commande Minerva Flow et commande Clover. L’export doit être mis en file et reprendre après une erreur réseau sans duplication.
- L’API Clover de création de commande atomique est la piste initiale à valider. Les produits et options doivent correspondre au catalogue du marchand. Les montants et taxes doivent être comparés avant tout envoi définitif.
- Aucun paiement n’est déclenché pour une commande à régler à la réception. Sa présence dans Clover ne prouve pas son paiement, son acceptation ni son impression.
- Une erreur ou une réponse perdue conserve l’état « transmission à vérifier »; le serveur recherche la commande associée avant de créer une nouvelle tentative. Ne pas supposer que les clés d’idempotence de l’API de paiement sont prises en charge par l’API de commandes.
- Les ventes importées depuis Clover doivent reconnaître les commandes déjà exportées: pas de seconde commande, de double crédit de fidélité ou de double comptage du chiffre d’affaires.
- Vérifier la réception dans les écrans Orders/Register du vrai environnement de test et, si demandée, l’impression sur le matériel du marchand. Ne pas promettre une compatibilité Clover Dining sans validation.

### Write orders — justification préparée pour cette phase

**Implémentation locale; justification à revoir après les essais Clover réels avant soumission.**

> Minerva Flow will use this permission to create a corresponding Clover order for a customer order placed through the restaurant’s Minerva Flow web or mobile app after the restaurant owner accepts it, and to maintain the supported order details as the restaurant processes it. Each export will belong to that restaurant’s authorized Clover merchant and retain a durable association with the original order to prevent duplicate exports. Orders payable at pickup will not be marked as paid by this export.

### Read / Write customers — uniquement si une fiche Clover est nécessaire

L’export d’une commande ne justifie pas à lui seul de copier tout le répertoire des clients. Si une fiche Clover est nécessaire pour la commande, prévoir une association persistante, rechercher une fiche déjà liée et utiliser seulement les données fournies pour le service de cette commande. La création d’un client et son rattachement à une commande demandent des opérations distinctes dans l’API Clover; ce flux doit être testé sans doublons.

**Read customers — brouillon pour une association client implémentée**

> Minerva Flow will use this permission to locate an existing Clover customer record when a restaurant needs to associate an exported order with its customer. It will use the stored Clover customer mapping or the customer-provided contact information for that order to avoid creating duplicate records.

**Write customers — brouillon pour une association client implémentée**

> When a customer record is required for an exported restaurant order and no corresponding record exists, Minerva Flow will use this permission to create or update that order customer’s Clover record using the information provided for the order. The record will be scoped to the restaurant’s authorized merchant. Unrelated customer records will not be modified.

## Phase 3 — paiement en ligne Clover

Préparer un marchand sandbox compatible Ecommerce et vérifier les permissions spécifiques des endpoints réellement retenus. Construire le paiement via les mécanismes Clover adaptés; les apps ne doivent pas embarquer de secret marchand ni transmettre des données de carte brutes au serveur Minerva Flow.

Avant activation, vérifier les paiements réussis/refusés, les interruptions, la protection contre un double débit, la confirmation serveur du statut, les taxes, la fidélité et le traitement documenté des annulations/remboursements. Afficher le paiement en ligne seulement quand la configuration réelle et les contrôles sont opérationnels.

Les raisons Payments/Ecommerce sont préparées dans `CLOVER_CHAMPS_A_SAISIR.md` à partir de ce parcours. Elles ne peuvent pas annoncer un traitement de paiement déjà disponible. L’implémentation est demandée, mais dépend de l’autorisation réelle du marchand et de la validation d’une association unique de commande : `/v1/charges` crée une commande alors que le schéma documenté de paiement d’une commande ne propose pas `capture`. Le plan de reprise figure dans `HANDOFF.md`.

## Dépendances encore ouvertes

1. Enregistrement réel des réglages développeur et autorisation du marchand.
2. Configuration des secrets dans les environnements adaptés, avec renouvellement OAuth fonctionnel.
3. Validation réelle des annulations automatiques après export, demandées par Kael, et du remboursement après débit; le déclenchement de l’export après acceptation est confirmé.
4. Variantes, taxes, type de retrait et impression à valider avec le catalogue et le matériel Clover du marchand.
5. Traitement des fiches clients, seulement si nécessaire au flux d’export retenu.
6. Tarification de l’application publique et horaires d’assistance encore à confirmer.

## Références officielles

- [Permissions Clover](https://docs.clover.com/dev/docs/permissions)
- [Création de commande atomique](https://docs.clover.com/dev/reference/ordercreateatomicorder)
- [Commandes, clients, affichage et impression](https://docs.clover.com/dev/docs/orders-faqs)
- [Permissions Ecommerce par endpoint](https://docs.clover.com/dev/docs/ecommerce-app-permissions)
- [Paiements et idempotence des débits](https://docs.clover.com/dev/docs/ecommerce-accepting-payments)
