# Minerva Flow — champs Clover à saisir

Préparé le 9 octobre 2026. Kael a confirmé une application **publique** pour les restaurateurs Minerva Flow et la saisie manuelle dans Safari. Ces valeurs sont préparées; elles ne certifient pas qu’elles ont été enregistrées dans Clover. Une application existe maintenant sous le nom affiché « Minerva Flow - Loyalty & Rewards Apps ». Le dernier écran lu est la fenêtre Edit Requested Permissions; les justifications sont vides et l’enregistrement n’a pas été vérifié.

## 1. Create App

| Champ | Valeur |
| --- | --- |
| App Name | `Minerva Flow` |
| Country | `Canada` |
| Supported languages | Français et English |
| App type / distribution | Public app |
| Platform / REST client | Web |
| Publisher | `Minerva Technologies Inc.` |

L’intégration Clover est exécutée par le serveur web de Minerva Flow. Les apps iOS et Android des clients et restaurateurs ne sont pas des APK à installer sur un terminal Clover; le choix Web correspond à cette intégration.

Commencer les essais dans Sandbox. Créer ensuite l’application Production distincte et reprendre les mêmes champs publics. La vérification du compte développeur et l’approbation de l’application restent des étapes distinctes.

## 2. REST Configuration

| Champ | Valeur |
| --- | --- |
| Site URL | `https://www.minervaflow.app` |
| Alternate Launch Path | `/api/oauth/clover` |
| Default OAuth Response, si proposé | `Code` |
| OAuth callback / redirect URI, si champ proposé | `https://www.minervaflow.app/api/oauth/clover/callback` |
| Webhook URL | `https://www.minervaflow.app/api/webhooks/clover` |
| Webhook subscriptions | Orders |

Conserver exactement `https` et `www` dans ces champs. Le démarrage OAuth de Minerva Flow renseigne explicitement le callback et un état signé. La documentation Clover exige que le domaine et le schéma du callback correspondent au Site URL. Ne pas saisir de secret dans une URL.

### Configuration par le restaurateur dans Minerva Flow

Oui: Clover peut ouvrir Minerva Flow et le restaurateur peut poursuivre la configuration dans son portail web. Le parcours attendu est:

1. Ouvrir Minerva Flow depuis la fiche ou le tableau de bord Clover.
2. Se connecter ou créer son compte Minerva Flow, puis choisir un établissement pour lequel il dispose de droits de gestion actifs.
3. Ouvrir **Paramètres → Point de vente → Clover → Connecter**.
4. Autoriser les permissions dans l’écran Clover du marchand.
5. Revenir à Minerva Flow pour vérifier la connexion, importer le catalogue en brouillons et contrôler la synchronisation des ventes.

Les identifiants de l’application, sa fiche et les permissions restent configurés une fois par Minerva Technologies Inc. dans le portail développeur. Le restaurateur n’a pas à créer une application Clover ni à saisir un App Secret.

Le flux OAuth et le retour vers `/settings` existent dans le dépôt. La route de lancement actuelle refuse cependant une session sans droits de gestion, au lieu de proposer une reprise guidée après connexion. Cette entrée doit être améliorée avant une distribution publique; le parcours ci-dessus n’est pas encore certifié de bout en bout avec un marchand réel.

### Facturation: une redirection ne remplace pas la configuration Clover

La documentation de monétisation Clover indique que les frais d’application publique doivent passer par Fiserv/Clover et qu’un niveau d’abonnement est requis, même gratuit. Ne pas mettre en place un paiement externe de l’application Clover en supposant qu’un simple lien vers la facturation Minerva Flow le permet. La coexistence avec l’abonnement Minerva Flow existant doit être clarifiée avec Clover avant de publier une offre; aucun nouveau prix ni double prélèvement n’a été configuré.

## 3. Requested Permissions — justifications à copier

Les noms peuvent apparaître au singulier (`Read order`) ou au pluriel selon l’écran. Utiliser la catégorie Orders correspondante.

### Read merchant — MERCHANT_READ

**English — justification for review**

> Minerva Flow uses the merchant identifier and basic business information to verify the authorized Clover merchant and associate the connection with the correct restaurant workspace. This permission supports connection validation and prevents restaurant data from being assigned to another merchant. Merchant settings are not modified by this integration.

**Français**

> Minerva Flow utilise l’identifiant marchand et les informations générales de l’établissement pour vérifier le compte Clover autorisé et rattacher la connexion au bon espace restaurant. Cette permission permet de valider la connexion et d’éviter d’attribuer les données d’un marchand à un autre établissement.

### Read customers — lecture liée aux commandes et paiements

**English — proposed feature justification, not yet implemented**

> Minerva Flow will use Read customers where required by Clover's order payment and refund endpoints and to retrieve customer information associated with linked restaurant orders. Access will be limited to the authorized restaurant's Clover merchant and information needed for order fulfillment and payment reconciliation. Customer data will not be shared across restaurant workspaces or used to subscribe customers to marketing without separate consent.

**Français**

> Minerva Flow utilisera Read customers lorsque les endpoints Clover de paiement ou de remboursement de commande l’exigent, et pour lire les informations du client associé à une commande liée. L’accès restera limité au marchand du restaurant autorisé et aux données nécessaires au traitement de la commande et au rapprochement du paiement. Ces données ne seront ni partagées entre espaces restaurants ni utilisées pour inscrire le client aux promotions sans consentement distinct.

La [matrice Clover](https://docs.clover.com/dev/docs/ecommerce-app-permissions) exige Read customers notamment pour `/v1/orders/{orderId}/pay`, `/v1/orders/{orderId}/returns` et `/v1/refunds`. Le flux retenu déterminera les endpoints effectivement utilisés. Cette permission ne justifie pas un import global des clients.

### Write customers — création et mise à jour de la fiche liée à la commande

**English — proposed feature justification, conditional on implementing customer record synchronization**

> Minerva Flow will create or update the Clover customer record associated with an accepted restaurant order using the customer's provided name, email address and, when needed for order fulfillment, phone number. A durable customer mapping will be used to avoid duplicate records. Writes will be limited to the authorized restaurant's connected Clover merchant and will not enroll customers in marketing or store full card numbers or security codes.

**Français**

> Minerva Flow créera ou mettra à jour la fiche client Clover associée à une commande acceptée, avec le nom et le courriel fournis par le client et son téléphone lorsqu’il est nécessaire au traitement de la commande. Une association durable permettra d’éviter les fiches en double. Les écritures resteront limitées au marchand du restaurant autorisé, sans inscription automatique aux promotions ni stockage du numéro de carte complet ou du code de sécurité.

**État:** la synchronisation des fiches clients n’est pas encore implémentée ou testée. Write customers n’est pas nécessaire à la simple préautorisation/capture; cette justification convient seulement si la création et la mise à jour des fiches liées aux commandes sont effectivement retenues et réalisées. Le paiement demandé n’implique pas l’enregistrement d’une carte pour de futurs achats.

### Read order — ORDERS_READ

**English — justification for review**

> Minerva Flow reads paid orders, their stable identifiers, timestamps, totals and line items to import completed sales into the authorized restaurant’s order history and sales reports. Stable order identifiers allow repeated synchronization and webhook delivery to recognize previously imported sales. The planned order export will also use this permission to read back linked orders and investigate uncertain transmissions before any further creation attempt.

**Français**

> Minerva Flow lit les commandes payées, leurs identifiants, dates, montants et articles pour importer les ventes terminées dans l’historique et les rapports du restaurant autorisé. Les identifiants Clover permettent de reconnaître les ventes déjà importées lors d’une nouvelle synchronisation ou d’un nouvel événement webhook.

### Read inventory — INVENTORY_READ

**English — justification for review**

> Minerva Flow reads product identifiers, names, prices and available stock quantities so the restaurant can import its Clover catalog and associate existing products with its Minerva Flow menu. New imports remain inactive drafts until the restaurant reviews them. This permission supports catalog import and product matching; it does not publish new products automatically.

**Français**

> Minerva Flow lit les identifiants, noms, prix et quantités disponibles des produits pour permettre au restaurant d’importer son catalogue Clover et d’associer les articles à son menu Minerva Flow. Les nouveaux articles importés restent des brouillons inactifs jusqu’à leur vérification par le restaurant.

### Write inventory — choix demandé par Kael

Kael a coché Write inventory pour permettre les modifications depuis Minerva Flow. Les écritures correspondantes existent dans le code, mais la connexion et les essais avec un marchand Clover restent à effectuer.

**English — justification if enabled**

> Minerva Flow uses this permission to create, update or remove linked Clover catalog products and update their stock quantities when an authorized restaurant owner or manager changes the corresponding menu or inventory information. Synchronization is scoped to that restaurant’s connected Clover merchant. Draft products with unconfirmed prices are excluded from catalog exports.

**Français**

> Minerva Flow crée, met à jour ou retire les produits Clover liés au menu et ajuste leurs stocks lorsqu’un propriétaire ou gestionnaire autorisé modifie les informations correspondantes. Chaque synchronisation reste limitée au marchand du restaurant. Les brouillons sans prix confirmé sont exclus des exports.

### Write orders — phase commandes autorisée, implémentation en cours

**English — draft for the order export feature**

> Minerva Flow will create a corresponding unpaid Clover order after the restaurant owner accepts a customer order placed through its web or mobile app. The export will preserve the approved items, options, notes and amounts and maintain a durable link to the original Minerva Flow order. The integration will check uncertain transmissions before another creation attempt to prevent duplicate orders. Creating an order will not initiate a payment.

**Français**

> Minerva Flow créera une commande Clover après acceptation par le propriétaire. L’export conservera les articles, options, notes et montants validés ainsi qu’une association durable avec la commande originale. Une transmission incertaine devra être vérifiée avant toute nouvelle création. La création de la commande ne déclenchera aucun paiement.

Cette permission correspond au contrat demandé, encore à implémenter et valider sur un marchand sandbox. La justification Read orders couvre aussi la lecture et la réconciliation des commandes exportées. La synchronisation des annulations demandée par Kael reste désactivée avant une validation sandbox de la suppression des commandes non payées; aucune annulation ne déclenche de remboursement.

### Read employees — attribution des commandes demandée par Kael

**English — justification for the implemented feature, awaiting live validation**

> Minerva Flow reads the Clover employee identifier and display name associated with an order so an authorized restaurant owner or manager can identify the team member who handled it. Reads are limited to employees referenced by the restaurant’s orders. Minerva Flow does not modify employee records or retrieve payroll or shift records.

**Français**

> Minerva Flow lit l’identifiant et le nom affiché de l’employé Clover associé à une commande afin de permettre au propriétaire ou gestionnaire autorisé d’identifier le membre de l’équipe qui l’a traitée. Les lectures sont limitées aux employés référencés par les commandes du restaurant. Aucun employé, salaire ou horaire n’est modifié ou récupéré.

Kael a confirmé cette fonction. La lecture ciblée `/employees/{id}`, la persistance sur la commande originale ou importée et l’affichage dans la liste propriétaire web sont implémentés localement. L’activation par restaurant, le déploiement et les essais réels Clover restent requis. Write employees reste désactivé.

### Read payments — paiement demandé, autorisation marchand requise

**English — proposed feature justification, not yet implemented**

> Minerva Flow will read Clover charge and refund identifiers, amounts and statuses to distinguish card pre-authorizations from captured payments, reconcile them with the restaurant's linked orders, and verify uncertain payment responses before any further financial operation. This permission will support payment status display and automatic cancellation or refund when the restaurant declines an order. Card entry will use Clover-hosted fields; Minerva Flow will not collect or store full card numbers or security codes.

**Français**

> Minerva Flow lira les identifiants, montants et statuts des paiements et remboursements Clover pour distinguer une préautorisation d’un débit, les rapprocher des commandes liées et vérifier les réponses incertaines avant une autre opération financière. Cette lecture permettra d’afficher un état vérifié et de contrôler l’annulation ou le remboursement d’une commande refusée. La saisie de carte utilisera les champs hébergés par Clover; Minerva Flow ne collectera ni ne stockera le numéro de carte complet ou le code de sécurité.

### Write payments — capture après acceptation

**English — proposed feature justification, not yet implemented**

> Minerva Flow will use Write payments, together with Read payments and Online payments, to capture a customer's previously authorized Clover charge only after an authorized restaurant owner or manager accepts the linked order. The captured amount will match the server-validated order amount and will not exceed the authorized amount. A durable payment reference and reconciliation of uncertain responses will guard against repeated captures. Pay-at-pickup orders will not initiate an online charge or capture.

**Français**

> Minerva Flow utilisera Write payments avec Read payments et Online payments pour capturer une somme préautorisée par le client uniquement après l’acceptation de la commande par un propriétaire ou gestionnaire autorisé. Le montant correspondra à la commande validée par le serveur et ne dépassera pas la préautorisation. Une référence durable et la vérification des réponses incertaines protégeront contre les captures répétées. Les commandes payables à la réception ne déclencheront aucun paiement en ligne.

### Ecommerce / Online payments — préautorisation et traitement en ligne

**English — proposed feature justification, not yet implemented**

> Minerva Flow will use Clover Ecommerce to tokenize a customer's card through Clover-hosted fields and pre-authorize the server-validated amount of a restaurant order. Funds will be captured only after restaurant acceptance. A declined order will release the authorization, or receive an automatic full refund if funds have already been captured, using the supported Clover transaction operation. Financial operations will be associated with durable order and payment references and verified against Clover responses.

**Français**

> Minerva Flow utilisera Clover Ecommerce pour tokeniser la carte dans les champs hébergés par Clover et préautoriser le montant de la commande validé par le serveur. Le débit aura lieu après acceptation par le restaurant. Un refus libérera la préautorisation ou entraînera un remboursement intégral automatique si le montant a déjà été débité, par l’opération Clover adaptée. Les opérations seront associées à des références durables de commande et de paiement et vérifiées auprès de Clover.

**Décisions confirmées le 9 octobre 2026:** préautorisation à la commande, capture après acceptation et remboursement automatique en cas de refus du restaurant après débit. Le paiement à la réception reste le seul mode actuellement configuré. Le paiement en ligne est maintenant demandé pour implémentation, mais pas activé.

**État vérifié à 15:34 UTC:** aucune connexion Clover dans `pos_connections`, en Staging comme en Production; Composio signale aussi l’absence de connexion active. Les trois textes ci-dessus décrivent le périmètre demandé et ne doivent pas être présentés comme une fonction déjà testée lors d’une soumission. L’autorisation du marchand Sandbox et l’activation Ecommerce doivent précéder l’implémentation et les essais.

Clover exige Read payments, Write payments et Online payments pour la capture d’une préautorisation. Les permissions de remboursement dépendent de l’endpoint; Write payments n’est pas une justification universelle pour tous les remboursements. Voir la [matrice officielle des permissions](https://docs.clover.com/dev/docs/ecommerce-app-permissions).

Le schéma documenté de `/v1/orders/{orderId}/pay` ne contient pas de champ `capture`, tandis que `/v1/charges` avec `capture=false` crée sa propre commande Clover. Il faut valider une association unique avec le flux d’export avant toute activation; ajouter une préautorisation puis exporter aveuglément une autre commande créerait un risque de doublon. Voir [paiements et préautorisations Clover](https://docs.clover.com/dev/docs/ecommerce-accepting-payments).

### État réel des cases et portée de soumission

À la dernière lecture de Safari, Customers, Inventory, Orders et Payments étaient cochés en lecture/écriture, Employees et Merchant en lecture seule, et Ecommerce activé. Les justifications étaient vides; Save n’est pas vérifié. Les cases ne prouvent ni une fonction opérationnelle ni un consentement marchand renouvelé. Pour le périmètre déjà implémenté, les appels utilisent Read merchant, Read orders et Read/Write inventory. Write orders et Read employees ont maintenant une implémentation locale désactivée ou configurable, dont la validation réelle reste requise. Customers et Payments restent des fonctions ultérieures à implémenter.

### Vérifications du code après l’activation des cases Write

- Résolution serveur du rôle actif propriétaire/gestionnaire pour les synchronisations déclenchées depuis l’app, avec le même identifiant restaurant. La création/modification locale autorisée à un employé ne suffit plus à déclencher un export POS.
- Contrôle du drapeau persistant `is_draft` avant un export, y compris la réconciliation du cron. Une erreur de lecture empêche l’export.
- Le compteur de resynchronisation compte les envois réussis, au lieu de multiplier le nombre d’articles par le nombre de fournisseurs.
- Ces correctifs sont locaux et n’ont pas encore été déployés. Le renouvellement OAuth et les tests Clover réels restent requis.

## 4. Fiche publique — textes

### Accroche française

Reliez vos ventes et votre catalogue Clover à votre espace restaurant Minerva Flow.

### Description française

Minerva Flow réunit le menu, les commandes clients et la fidélisation de votre restaurant. L’intégration Clover permet aux propriétaires et gestionnaires autorisés de relier leur caisse à leur espace de gestion.

Importez les ventes Clover payées pour retrouver les commandes terminées et suivre les résultats de votre restaurant. Importez également les articles de votre catalogue Clover sous forme de brouillons, puis vérifiez leurs prix et associez-les aux produits de votre menu avant de les activer.

Chaque connexion est rattachée à un restaurant. Les événements de commande peuvent déclencher une nouvelle synchronisation; les identifiants de vente permettent de reconnaître les commandes déjà importées.

La connexion nécessite un compte Minerva Flow disposant de droits de gestion actifs et l’autorisation du marchand Clover. Les fonctionnalités disponibles dépendent des permissions accordées et de la configuration du restaurant.

### English tagline

Connect your Clover sales and catalog to your Minerva Flow restaurant workspace.

### English description

Minerva Flow brings your restaurant’s menu, customer orders and loyalty experience together. The Clover integration lets authorized owners and managers connect their register to their restaurant management workspace.

Import paid Clover sales into your completed order history and restaurant reports. Import Clover catalog items as inactive drafts, review their prices and match them to your menu before activating them.

Each connection belongs to a restaurant. Order notifications can trigger a new sales synchronization, while stable sale identifiers help recognize previously imported orders.

Connecting requires a Minerva Flow account with active management access and authorization from the Clover merchant. Available features depend on the granted permissions and restaurant configuration.

### Bénéfices / feature bullets

1. Import des ventes payées / Paid sales import.
2. Catalogue importé en brouillons / Catalog imported as drafts.
3. Association des produits / Product matching.
4. Historique et rapports par restaurant / Restaurant order history and reports.

Ces textes constituent une proposition de fiche, pas une déclaration de tests Clover terminés. La synchronisation sortante n’est pas annoncée avant sa validation.

## 5. Assistance et pages légales

| Champ | Valeur |
| --- | --- |
| Website | `https://www.minervaflow.app` |
| Support URL | `https://www.minervaflow.app/fr/support` |
| Support email | `flow@minervaflow.app` |
| Support phone | `+1 514 451-5232` |
| Privacy policy | `https://www.minervaflow.app/fr/legal/privacy` |
| Terms / EULA | `https://www.minervaflow.app/fr/legal/terms` |
| Business address | 367 rue Laberge, Repentigny (Québec) J6A 4C2, Canada — sans suite |
| Support hours | À confirmer; ne pas inventer d’horaires |

L’adresse est celle du dépôt et le téléphone/sans suite ont été confirmés par Kael. Si Clover affiche une orthographe différente de la rue, confirmer ce champ avant de soumettre les informations légales.

## 6. Visuels, tarification et informations d’examen

- L’icône actuelle du build iOS se trouve dans `native/ios/MinervaFlow/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png`. La contrôler avant de l’utiliser pour la fiche publique. Le logo du restaurant est un élément distinct, toujours attendu de la cliente.
- Les captures disponibles dans `public/screenshots` montrent la connexion, pas une intégration Clover opérationnelle. Préparer de vraies captures de connexion, import et synchronisation après les essais sandbox.
- La tarification Clover reste à définir. Ne pas inventer un abonnement, une commission, un prix gratuit ou un essai Clover à partir de l’abonnement Minerva Flow existant. Contrôler les règles de distribution et de facturation de Clover avant de fixer cette section.
- Les identifiants d’examen doivent correspondre à un compte de gestion dédié et à un marchand sandbox. Ne pas transmettre le compte réel de Mains Magiques ADM dans une fiche publique.

## 7. Secrets et activation réelle

Après création de l’application, enregistrer les secrets dans Vercel pour **le bon environnement**, jamais dans ce document ou dans le chat:

```text
CLOVER_APP_ID
CLOVER_APP_SECRET
CLOVER_ENVIRONMENT=production
CLOVER_WEBHOOK_AUTH_CODE
```

Sandbox utilise une application et des identifiants distincts. Le code webhook doit correspondre à celui fourni par Clover; ce n’est ni l’App Secret ni un code choisi arbitrairement. Achever la vérification de l’URL webhook avant d’activer les événements.

### Contrôles nécessaires avant d’afficher « opérationnel »

1. Création et permissions réellement enregistrées; compte développeur vérifié avant soumission.
2. Échange OAuth v2 et renouvellement des jetons fonctionnels. Le code actuel doit encore être corrigé pour le renouvellement; une clé saisie ne suffit pas.
3. Persistance des jetons confirmée dans le coffre et autorisation propriétaire/gestionnaire vérifiée.
4. Import réel sandbox, brouillons contrôlés, mêmes ventes non importées deux fois.
5. Vérification webhook, événements non autorisés refusés et nouvelle synchronisation réelle.
6. Déconnexion/révocation et reconnexion vérifiées.
7. Pages légales adaptées au traitement des données Clover, captures et compte d’examen prêts.
8. Tarification, éventuelle écriture du catalogue et horaires d’assistance confirmés.
9. Approbation Clover puis autorisation du vrai marchand, avec contrôle des ventes et produits rattachés au bon restaurant.

Le « Plat de poisson » reste non commandable et sans prix confirmé. Ses trois riz ont le même prix; aucune valeur zéro technique ne doit être exportée comme prix commercial.

## Sources officielles

- [Créer une application](https://docs.clover.com/dev/docs/creating-an-app)
- [Autorisations et justifications](https://docs.clover.com/dev/docs/permissions)
- [OAuth et domaines](https://docs.clover.com/dev/docs/oauth-flows-in-clover)
- [Jetons OAuth v2](https://docs.clover.com/dev/docs/generate-expiring-tokens-using-v2-oauth-flow)
- [Renouvellement des jetons](https://docs.clover.com/dev/docs/refresh-access-tokens)
- [Webhooks](https://docs.clover.com/dev/docs/webhooks)
- [Lancement OAuth depuis Clover](https://docs.clover.com/dev/docs/merchant-dashboard-left-navigation-oauth-flow)
- [Monétisation des applications](https://docs.clover.com/dev/docs/monetizing-your-apps)
