# Minerva Flow — Spécification mobile white-label iOS & Android

## Objectif

Fournir à chaque client une application mobile complète, personnalisée à sa marque, disponible sur iOS et Android, tout en conservant une base de code et des systèmes fonctionnels communs.

Chaque déploiement client doit pouvoir remplacer le nom, l’icône, les couleurs, les textes, les restaurants, les intégrations et les règles métier sans fork du produit.

## Expérience attendue côté client final

### 1. Accueil

- Logo et identité du restaurant ou réseau.
- Recherche de restaurants, menus et plats.
- Restaurants favoris et recommandations.
- Statut ouvert/fermé, temps estimé et distance.
- Bannière promotionnelle configurable.
- Accès rapide aux commandes en cours et aux récompenses.

### 2. Authentification et compte

- Inscription par e-mail, téléphone, Apple et Google.
- Connexion, déconnexion et récupération de mot de passe.
- Vérification d’e-mail/téléphone.
- Gestion du profil, nom, photo et préférences.
- Gestion des adresses de livraison.
- Gestion des moyens de paiement tokenisés.
- Préférences de notification et de marketing.
- Suppression complète du compte et export des données.

### 3. Découverte d’un restaurant

- Liste et carte avec filtres : distance, horaires, cuisine, prix et livraison.
- Fiche restaurant : horaires, adresse, téléphone, photos, avis, allergènes et politiques.
- Menu par catégories avec disponibilité en temps réel.
- Détail d’un article : variantes, suppléments, instructions et allergènes.
- Favoris et partage sécurisé d’un restaurant ou d’un article.

### 4. Commande sur place, à emporter et livraison

- Sélection du mode : sur place, à emporter ou livraison.
- Panier persistant et validation des disponibilités.
- Adresse, instructions et contact de livraison.
- Calcul transparent des frais : distance, temps, zone, minimum de commande et pourboire.
- Estimation avant paiement et recalcul défensif côté serveur.
- Coupons, crédits, récompenses et taxes.
- Paiement Stripe et intégration POS lorsque disponible.
- Confirmation idempotente et prévention des doubles commandes.
- Suivi des étapes : reçue, acceptée, en préparation, prête, en livraison, livrée, annulée.
- Contact restaurant et support avec journal de conversation.
- Reçu, facture et historique complet.
- Remboursement partiel ou total selon les permissions.

### 5. Fidélisation

- Solde de points et historique des mouvements.
- Niveaux, avantages et progression.
- Récompenses disponibles et conditions d’utilisation.
- Coupons, offres ciblées et expiration clairement affichée.
- Parrainage configurable.
- Notifications lors des gains, expirations et changements de niveau.

### 6. Avis et support

- Avis après une commande éligible.
- Note restaurant et note livraison séparées.
- Signalement d’un problème avec pièces jointes facultatives.
- Centre d’aide, FAQ et contact support.
- Numéro ou chat du restaurant uniquement lorsqu’il est autorisé.

## Navigation mobile

Onglets recommandés :

1. Accueil
2. Explorer
3. Commandes
4. Fidélité
5. Profil

Les écrans secondaires doivent être accessibles par navigation profonde : restaurant, article, panier, paiement, suivi, récompense, adresse, reçu, support et paramètres.

## Espace restaurant / opérateur

Si le client demande une application opérateur distincte, elle doit inclure :

- tableau de bord du jour ;
- commandes entrantes avec sons et notifications ;
- acceptation, refus et temps de préparation ;
- menu, disponibilité et prix ;
- règles de livraison et zones desservies ;
- suivi des chauffeurs ;
- clients, fidélité et campagnes ;
- rapports ventes, marges, remboursements et pourboires ;
- intégrations Stripe, POS, imprimante et comptabilité ;
- collaborateurs, rôles et journaux d’audit ;
- paramètres du restaurant et heures exceptionnelles.

## White-label et configuration par client

La configuration doit être pilotée par tenant, sans code spécifique au client :

- nom affiché, domaine et bundle/application ID ;
- icône, splash screen, couleurs, typographies et illustrations ;
- langues, devise, fuseau horaire et taxes ;
- restaurants visibles et zones géographiques ;
- modes de commande activés ;
- règles de points, coupons et niveaux ;
- frais de livraison et formule de tarification ;
- Stripe Connect, compte POS et webhooks ;
- fournisseurs de cartes, SMS, e-mail et push ;
- liens légaux, support et politique de confidentialité ;
- feature flags et version minimale supportée.

Les secrets, clés Stripe, certificats Apple et fichiers Google ne doivent jamais être stockés dans l’application. Ils doivent rester côté serveur ou dans le gestionnaire de secrets du déploiement.

## Backend et données

Les API doivent appliquer :

- isolation stricte par `tenant_id` et `restaurant_id` ;
- Row Level Security Supabase ;
- validation serveur de chaque prix, taxe, remise et frais ;
- idempotency keys pour commande, paiement, remboursement et webhook ;
- transitions d’état de commande explicites ;
- journal d’audit immuable ;
- retries avec backoff et dead-letter queue pour les webhooks ;
- observabilité : logs structurés, erreurs, métriques et traces ;
- mode dégradé lisible lorsque POS, carte ou livraison sont indisponibles.

Tables ou domaines minimum : utilisateurs, tenants, restaurants, menus, articles, commandes, lignes de commande, adresses, paiements, remboursements, livraisons, chauffeurs, points, récompenses, coupons, avis, notifications, intégrations et audit logs.

## Sécurité, confidentialité et conformité

- OAuth/Apple/Google avec validation serveur des tokens.
- Sessions courtes, rotation des refresh tokens et révocation.
- Biométrie uniquement pour verrouillage local, jamais pour stocker un secret.
- Données de carte uniquement via Stripe ; aucun numéro de carte en base.
- Permissions minimales pour localisation, caméra, notifications et contacts.
- Privacy manifests iOS et déclarations Google Play Data Safety.
- Consentement marketing séparé et révocable.
- Accès, correction, export et suppression des données.
- Liens légaux par tenant, visibles avant inscription et paiement.
- Protection anti-fraude, rate limiting et détection des abus de coupons.

## Parité iOS / Android

Chaque fonctionnalité livrée doit être validée sur les deux plateformes :

- navigation et deep links ;
- notifications push et ouverture sur le bon écran ;
- paiement et retour après 3-D Secure ;
- localisation et adresses ;
- caméra/QR si activée ;
- clavier, accessibilité et tailles de texte ;
- mode clair/sombre ;
- hors-ligne et reprise après interruption ;
- performance sur appareil moyen et réseau lent.

## États UI indispensables

Chaque écran de données doit prévoir :

- skeleton/shimmer au chargement ;
- état vide utile avec action ;
- erreur récupérable avec réessayer ;
- état hors-ligne ;
- confirmation avant action irréversible ;
- succès explicite après paiement, commande, remboursement ou suppression ;
- prévention du double clic et bouton désactivé pendant une mutation.

## Publication Apple et Google

### iOS

- Bundle ID, certificats, profils et App Store Connect par client.
- Icônes, captures, description, mots-clés, URL support et politique de confidentialité.
- Privacy manifest, permissions et compte de démonstration.
- Suppression de compte fonctionnelle.
- TestFlight interne puis externe.
- Audit App Store avant chaque soumission.

### Android

- Package ID, clé de signature et application Play Console par client.
- Data Safety, politique de confidentialité et déclaration des permissions.
- Fiche Play Store, captures, icône, catégorie et contenu de démonstration.
- Internal testing, closed testing puis production progressive.
- Suppression de compte et gestion des données utilisateur.

## Stratégie de tests

- Tests unitaires : calculs, fidélité, taxes, frais de livraison et transitions de commande.
- Tests API : RLS, permissions, idempotence, webhooks et erreurs POS/Stripe.
- Tests end-to-end : inscription, commande, paiement, livraison, annulation, remboursement et récompense.
- Tests visuels : chaque route principale sur iOS et Android.
- Tests réseau : lent, coupure, reprise et doublons.
- Tests de charge sur catalogue, panier et commandes simultanées.
- Tests de sécurité : accès cross-tenant, tokens expirés, abus de coupons et deep links.
- Validation manuelle TestFlight/Google Internal Testing sur appareils réels.

## Critères de sortie d’un client white-label

Un client est prêt à être livré uniquement lorsque :

- toutes les routes client et opérateur prévues sont accessibles ;
- aucune donnée d’un autre tenant n’est visible ;
- une commande réelle de test traverse le POS/Stripe et revient correctement ;
- le calcul de livraison est vérifié sur plusieurs distances ;
- paiement, remboursement et webhook sont confirmés ;
- notifications et deep links fonctionnent ;
- suppression de compte est vérifiée ;
- les fiches Apple et Google sont complètes ;
- les tests iOS et Android sur appareils réels sont passés ;
- les logs, alertes et rollback sont opérationnels ;
- le client a validé le branding, les textes légaux et les règles commerciales.

## Handoff recommandé

Le handoff doit contenir :

- le fichier de configuration du tenant ;
- les assets de marque et leurs licences ;
- les identifiants des comptes Apple/Google ;
- les connexions Stripe/POS et la matrice de permissions ;
- les règles de prix et de livraison approuvées ;
- les comptes de démonstration ;
- le rapport de tests et les limites connues ;
- le plan de support, rollback et renouvellement des certificats.

