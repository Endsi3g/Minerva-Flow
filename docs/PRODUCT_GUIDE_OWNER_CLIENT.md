# Minerva Flow — guide produit pour restaurateurs et clients

> Guide de référence fonctionnel. Mis à jour le 23 septembre 2026. Les options peuvent varier selon le rôle, le restaurant, le forfait et les intégrations effectivement connectées.

## En bref

Minerva Flow relie l’exploitation d’un restaurant à la relation avec ses clients. Le restaurateur gère son activité depuis un espace web ou l’application iOS; le client découvre le restaurant, utilise son programme de fidélité et peut commander par les parcours activés par cet établissement.

Ce n’est pas un système de caisse universel qui remplace automatiquement chaque POS. Les ventes, paiements, campagnes et synchronisations externes dépendent des connexions et réglages en place. Les frais du processeur de paiement, le cas échéant, demeurent distincts de toute commission de plateforme.

## Côté propriétaire, gérant et équipe

### 1. Configurer l’espace

Le propriétaire crée ou rejoint un espace de travail, ajoute un ou plusieurs restaurants, puis invite ses collaborateurs avec des rôles adaptés. Lorsqu’un espace regroupe plusieurs établissements, le sélecteur permet de passer de l’un à l’autre; les restaurants sont regroupés dans des sections repliables.

Les rôles et autorisations déterminent les pages et les actions disponibles. Les propriétaires et gérants disposent d’une navigation condensée, avec les outils d’exploitation accessibles dans des groupes secondaires. Le personnel reçoit les raccourcis utiles au travail quotidien.

### 2. Suivre le service

L’aperçu présente les indicateurs disponibles pour le restaurant et la période choisie. Les commandes directes, les jours de travail, le menu et les autres modules aident à suivre l’activité. Les données issues d’un POS ne sont visibles que si l’intégration correspondante est connectée et que les permissions nécessaires sont accordées.

Le propriétaire peut gérer le menu, les prix et disponibilités, les commandes, l’inventaire, les collaborateurs et les horaires. Certains flux de réception, de synchronisation, de paiement ou de notification dépendent d’un fournisseur externe configuré.

### 3. Fidéliser et suivre les recommandations

Le restaurateur configure son programme, ses récompenses et ses règles, puis partage un QR code ou un lien. Il peut retrouver un client au comptoir avec son numéro de téléphone; le solde reste masqué jusqu’à ce que le client confirme son identité à l’aide du code temporaire à six chiffres affiché dans son application. Le code présenté directement par le client permet aussi de l’identifier.

Les liens de parrainage distinguent les canaux pris en charge — QR, partage, lien copié, code ou lien direct. Les clics et les conversions sont consignés; l’activité de conversion apparaît lorsque la conversion est créditée selon les règles du programme. Cela permet de relier l’invitant, le nouveau client et le canal, sans compter une simple visite du lien comme une conversion.

### 4. Ouvrir le service aux clients

Selon les options activées, le restaurant peut partager un menu public, recevoir une demande de réservation ou accepter des commandes directes. Les précommandes affichent le créneau et le mode de remise choisis; les règles de paiement et les frais de livraison restent appliqués côté serveur.

Le formulaire du menu partagé accepte aussi des demandes de repas sur mesure et de traiteur. Le propriétaire ou le gérant chiffre les postes, règle les taxes et l’acompte (30 % par défaut), ajoute une note puis envoie un lien Stripe Checkout rattaché au compte Connect du restaurant. Une fois le paiement vérifié par webhook, la demande devient une commande de type traiteur ou sur mesure, planifiée à la date de l’événement. Dans Commandes, le calendrier hebdomadaire présente les événements par date locale, heure, nombre de convives et mode de remise; les commandes converties peuvent avancer de « confirmée » à « en préparation », « prête » puis « servie ». Les transitions existantes bloquent les actions lorsque le paiement requis n’est pas confirmé. Les demandes refusées, annulées ou expirées ne sont pas présentées comme productions planifiées.

Les clients peuvent aussi proposer et voter pour des plats dans le menu partagé et dans l’application iOS. Le propriétaire retrouve le classement dans l’application iOS et peut créer un brouillon de menu à partir d’une suggestion populaire; le brouillon reste à compléter et n’est pas publié automatiquement. Les offres spéciales d’anniversaire sont identifiées comme telles côté client lorsque le restaurant les a configurées et qu’elles sont admissibles.

Une intégration Stripe ou POS n’est pas présumée active : elle doit être configurée et vérifiée pour le restaurant. Les frais, paiements, taxes, livraison et délais présentés au client dépendent du flux réellement activé.

### 5. Utiliser l’application iOS propriétaire

Après authentification, l’application reconnaît l’expérience propriétaire et affiche une navigation mobile pour l’aperçu, les commandes, le menu, la fidélisation et la gestion. Sur iPad, elle passe à une présentation à colonnes; les orientations portrait, portrait inversé et paysage sont déclarées.

## Côté client

### 1. Créer ou ouvrir son compte

Le client s’authentifie dans l’application iOS ou le portail client lorsqu’il est disponible, complète son profil et rejoint le restaurant. Le menu d’accueil et les actions affichées dépendent de son compte et des fonctionnalités offertes par l’établissement.

### 2. Découvrir, commander et revenir

Le client peut consulter les restaurants, leurs offres et leurs menus, puis précommander un plat du menu pour un créneau ultérieur. Selon les options du restaurant, il choisit le paiement en ligne ou à la réception, puis la cueillette ou la livraison. Pour une adresse admissible, les frais sont recalculés côté serveur selon le tarif de base, la distance estimée et, si le propriétaire l’active, le temps de trajet estimé (0 $/minute par défaut); l’heure d’arrivée reste une estimation, pas une garantie de circulation en temps réel. Un client peut également demander un repas sur mesure ou un service traiteur; le prix final et l’acompte sont proposés par le restaurant avant paiement, et le paiement de l’acompte se fait par Stripe Checkout.

Depuis l’application iOS ou le menu partagé, les clients peuvent suggérer un plat et voter pour une suggestion ouverte. Une demande traiteur ou un repas sur mesure reste une demande de devis : elle ne constitue pas une commande payée tant que le restaurant n’a pas émis son devis et que le paiement de l’acompte n’a pas été confirmé.

### 3. Consulter ses points et utiliser son code

Les vues Accueil, Offres, Cartes et Profil permettent de retrouver les informations de fidélité et les mouvements associés. Dans l’onglet Scanner, le client peut afficher un QR code ou un code temporaire à six chiffres. Au comptoir, il peut donner ce code au membre du personnel ou confirmer ce même code après une recherche par téléphone. Le personnel ne voit le solde qu’après confirmation.

### 4. Parrainer un proche

Le client partage son lien ou son QR de parrainage. Le canal est conservé au fil du parcours compatible; lorsqu’une conversion est validée et créditée, le restaurateur peut consulter qui a invité le nouveau client, par quel canal et à quelle date.

## Ce qui est livré et ce qui dépend d’une configuration

| Domaine | Fonctionnement général | Dépendance ou limite |
|---|---|---|
| Espace propriétaire web | Gestion par restaurant et par rôle; menu, commandes, fidélisation et outils opérationnels | Les données et permissions dépendent de l’établissement et du rôle |
| iOS client et propriétaire | Expériences distinctes après authentification; navigation iPad adaptée | Un nouveau build doit être traité par Apple avant d’être installé via TestFlight |
| Identification client | Recherche par téléphone avec confirmation par code; code à six chiffres accepté directement | Le client doit fournir le code temporaire valide pour révéler son solde après recherche |
| Parrainage | Traçabilité du canal et des conversions créditées | Un clic seul n’est pas une conversion; seules les règles d’attribution configurées s’appliquent |
| POS et paiements | Des intégrations existent dans le produit | Connexion, permissions, région, forfait et validation en environnement réel requis |
| Commande/livraison | Précommande planifiée, choix de paiement, cueillette/livraison et tarification serveur par distance + minute estimée configurables | Le restaurant doit activer/configurer le mode; l’estimation actuelle n’est pas une route ou une circulation en temps réel |
| Marque blanche | Identité de workspace et bases d’interface configurables | Une app iOS/Android autonome par client, entièrement automatisée et prête à publier, reste un objectif de produit, pas une capacité générale à promettre |

## Statut iOS au 23 septembre 2026

Le build iOS `1.0 (11)` a été archivé et exporté localement. Il prend en charge iPhone et iPad, et le dSYM Sentry de l’archive correspond au framework. **Ce build n’a pas été téléversé sur App Store Connect/TestFlight** : il faut une session App Store Connect autorisée. Le lien bêta existant est [https://testflight.apple.com/join/xGr45uuF](https://testflight.apple.com/join/xGr45uuF); sa présence ne prouve pas que le build 11 y est disponible.
