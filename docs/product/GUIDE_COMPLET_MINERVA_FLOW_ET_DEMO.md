# Guide Minerva Flow — propriétaires, équipes et clients

> **Version 2.0 — 23 septembre 2026.** Ce document décrit les parcours présents dans le produit. Les intégrations, paiements, notifications et commandes dépendent de leur activation pour le restaurant. Pour la vue fonctionnelle détaillée, consulter le [guide produit propriétaire et client](PRODUCT_GUIDE_OWNER_CLIENT.md).

## 1. C’est quoi Minerva Flow ?

Minerva Flow relie la gestion quotidienne d’un restaurant à sa relation avec les clients. Le propriétaire et son équipe suivent les restaurants, les ventes disponibles, le menu, les commandes, l’inventaire et la fidélisation. Les clients consultent le programme, leurs points et récompenses, utilisent un code au comptoir et peuvent découvrir ou commander auprès des restaurants qui activent ces parcours.

La plateforme comprend un espace web pour l’équipe, une application iOS avec des vues client et propriétaire, ainsi que des pages web publiques pour le menu, le parrainage et certains parcours de commande ou réservation.

Minerva Flow complète les outils du restaurant; il ne remplace pas automatiquement son POS. Les paiements et synchronisations externes nécessitent une intégration connectée, autorisée et testée. Les frais de traitement de paiement restent distincts des frais de plateforme.

## 2. Parcours propriétaire et équipe

### Espace web

1. Le propriétaire ouvre son workspace et sélectionne l’établissement à gérer. Les restaurants d’un même groupe sont accessibles depuis un sélecteur repliable.
2. L’aperçu rassemble les indicateurs disponibles pour la période et l’établissement sélectionnés.
3. L’équipe utilise les modules permis par son rôle : menu, commandes, fidélisation, horaires, collaborateurs, inventaire, rapports, paramètres et autres outils disponibles.
4. Si un POS est connecté, ses données apparaissent selon les permissions et la configuration du fournisseur; sinon, elles ne sont pas supposées synchronisées.
5. Le propriétaire configure la fidélité et partage les QR/liens. La page de parrainage montre les conversions créditées et, pour les liens concernés, le canal de provenance.

### Identification au comptoir

1. Le membre du personnel recherche un client par téléphone.
2. Le solde et les visites restent masqués tant que le client n’a pas confirmé son identité avec le code temporaire à six chiffres affiché dans son application.
3. Le personnel peut aussi saisir directement le code présenté par le client.
4. Une fois le compte confirmé, il peut enregistrer la visite ou l’achat selon les règles et permissions du restaurant.

### Application propriétaire iOS

Après authentification, les comptes propriétaires et gérants sont dirigés vers l’interface opérationnelle native : Aperçu, Commandes, Menu, Fidélisation et Gestion. Sur iPad, la navigation devient une présentation à colonnes, avec support des orientations portrait et paysage.

## 3. Parcours client

1. **Accéder au compte** : le client ouvre l’application iOS ou le portail client et s’authentifie.
2. **Découvrir** : il consulte les restaurants, offres et menus disponibles.
3. **Commander** : si le restaurant active les commandes directes, il choisit des articles et transmet sa commande. Paiement en ligne, livraison, délais et taxes ne sont proposés que lorsqu’ils sont configurés pour ce parcours.
4. **Gérer sa fidélité** : il retrouve ses points, sa progression, ses offres, ses cartes et son profil.
5. **S’identifier en restaurant** : dans l’onglet Scanner, il affiche un QR ou un code à six chiffres pour le personnel.
6. **Parrainer** : il partage un lien ou un QR. Le système peut associer QR, partage, lien copié, code ou lien direct aux événements de clic et à une conversion ensuite créditée.

## 4. Démonstration sans exposer de compte

- Espace de connexion : <https://minervaflow.app/fr/login>
- Portail client : <https://minervaflow.app/fr/portal/login>
- Lien de bêta fourni : <https://testflight.apple.com/join/xGr45uuF>

Ne pas inscrire de mot de passe de démonstration ou de compte partagé dans la documentation. Utiliser un compte de test géré et révoquable, transmis par un canal sécurisé. Les essais de commandes ou paiements doivent utiliser un restaurant et des données de test isolés.

## 5. État des fonctions mobiles et marque blanche

Le client iOS comprend un parcours client et un parcours propriétaire. Le build iOS `1.0 (11)` a été archivé et exporté, mais n’a pas été téléversé dans App Store Connect/TestFlight. Le lien bêta ci-dessus ne prouve donc pas que ce build est disponible.

La personnalisation de marque et les paramètres de workspace constituent une base pour le white-label. La production automatisée d’une application iOS et Android autonome pour chaque restaurant — avec publication, paiement, livraison et support entièrement configurés — reste un chantier distinct; ne pas la présenter comme déjà prête pour tous les clients.

## 6. Limites à expliquer pendant une démo

- Les recommandations Flow AI dépendent des données et services connectés; elles sont des aides à l’analyse, pas des garanties de résultat.
- Les chiffres affichés proviennent des données disponibles pour le restaurant et la période sélectionnés; ne pas leur attribuer un taux de croissance ou de rétention garanti.
- Une intégration POS, Stripe, SMS, e-mail, push ou livraison doit être configurée et validée séparément.
- Une visite d’un lien de parrainage n’est pas automatiquement une conversion récompensée : la conversion doit satisfaire les règles du programme et être créditée.
- Le QR/code client facilite l’identification; la confirmation par code protège l’affichage du solde après recherche téléphonique.
