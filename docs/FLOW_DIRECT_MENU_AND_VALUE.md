# Flow Direct — menu, commandes et valeur client

Ce document décrit l’implémentation de Flow Direct et ses limites opérationnelles. Au 27 septembre 2026, les migrations `0156` à `0161` sont appliquées en staging et en production, la version web `2.48.0` est déployée, et le build iOS `1.0.0 (15)` est approuvé pour les testeurs externes TestFlight.

La candidate native locale `1.0.1 (16)` ajoute un espace Owner compatible iPad/Mac Catalyst et une page Google Business Profile. Sa migration additive `0162_google_business_profile_native.sql` étend les métadonnées de `google_connections`; elle est appliquée en staging sous la version `20260927054659`, mais pas en production. Les appels natifs vers la nouvelle API nécessitent aussi le déploiement serveur correspondant, qui n’a pas encore été effectué. L’IPA iOS a été exporté localement mais n’est pas téléversé dans TestFlight; l’archive macOS n’est pas signée pour distribution.

## Pages du studio

- `/menu` : catalogue, catégories, préparation et import.
- `/menu/design` : logo, palette, typographie et aperçu.
- `/menu/qr` : génération d’un lien partageable, QR imprimable et accès direct.
- `/menu/settings` : liens sociaux et moyens de contact publiés volontairement.
- `/app` : page publique avec captures, étapes TestFlight et création d’un compte client lié au restaurant.

Le menu public `/m/[token]` utilise les réglages de présentation sauvegardés dans `restaurants.menu_presentation`. Les éléments de présentation gardent leur nom, leur catégorie, leur descriptif et, lorsque le propriétaire le fournit, leur prix.

## Import et articles de présentation

L’outil d’import soumet un PDF ou une image JPEG, PNG ou WebP à la route authentifiée `/api/ai/menu-scan`. L’extraction ne sauvegarde rien directement : le propriétaire relit les résultats et choisit quels articles ajouter. `menu_items.is_orderable=false` permet d’afficher un article sans l’offrir à la commande. Le panier masque son contrôle d’ajout; `create_or_get_public_order` applique aussi cette restriction côté base de données.

`menu_items.is_featured` permet au propriétaire de choisir la sélection « À découvrir » au-dessus du catalogue. Le QR Studio fournit séparément le lien du menu et le lien vers la page d’installation.

## Commande sans paiement en ligne

Le client passe par l’authentification par lien courriel, choisit la cueillette ou une livraison configurée, puis paie en personne. La commande commence à l’état `soumise`; l’équipe la confirme, la prépare et la marque prête/servie. Le client consulte le statut avec les politiques RLS; la page s’actualise par Realtime et un rafraîchissement périodique de secours.

Les changements de statut envoient une mise à jour transactionnelle au courriel du client et, lorsqu’il a un profil lié, dans l’application et en notification push. Les courriels transactionnels ne sont pas des messages de marketing. L’annulation exige un motif conservé dans la commande et son journal d’événements; le client est informé qu’aucun paiement ne lui sera demandé. Les demandes gardent une clé d’idempotence et leurs contrôles de session/rate-limit existants.

Après l’envoi, `/app?order=<UUID>` interroge un endpoint à débit limité qui ne retourne que le statut, l’heure estimée, le motif d’annulation et un éventuel bonus reçu. L’identifiant aléatoire de commande sert de secret de suivi; aucune donnée d’identité, de contact ou de panier n’est retournée. La création de compte demande le nom, le courriel et le mot de passe, confirme le courriel puis appelle `join_restaurant_as_customer` avant d’ouvrir le portail.

## LTV et CAC

La page `/fidelisation/valeur-client` compare :

- **LTV revenu** : dépenses cumulées moyennes des profils clients qui ont au moins un achat.
- **LTV marge estimée** : LTV revenu multipliée par la marge brute du catalogue, pondérée par les quantités vendues lorsque disponibles.
- **LTV combinée** : somme des deux vues, selon la définition demandée. Elle est une mesure de présentation, et ne doit pas être interprétée comme une marge nette.
- **CAC 12 mois** : (publicité + commissions + agence + promotions + équipement saisis) ÷ nouveaux profils clients créés dans les 12 mois.

Les dépenses sont conservées par restaurant dans `customer_acquisition_costs`; seuls owner/manager disposent du formulaire d’ajout. Le système n’infère pas les coûts publicitaires ou d’équipement et n’écrit pas de faux montants.

La marge LTV est une approximation : l’application ne garde pas encore un instantané du coût ingrédient au moment de chaque achat. Le nombre de nouveaux profils client peut également inclure des importations récentes de POS.

## Fidélisation et stock

Les fonctions de fidélisation existantes (points, récompenses et parrainage) sont configurables depuis l’espace Fidélisation. Le bonus de bienvenue est configurable en points; zéro le désactive, et l’attribution unique intervient à la première commande admissible marquée « Servie ». Le taux visé de 15 % et le multiplicateur épicerie restent une simulation tant que le panier moyen et les coûts ne sont pas intégrés à un simulateur dédié.

La migration `0159` ajoute un registre d’application idempotent par ligne de commande et article d’inventaire. Les lignes sont consommées lors de la confirmation, du paiement réussi, ou après import POS; une annulation avant service restitue la quantité réellement prélevée. Cette transaction SQL crée aussi les mouvements d’inventaire correspondants.

Les alertes propriétaires se déclenchent à 30 % de la cible de réapprovisionnement (modifiable dans Paramètres → Alertes). Le franchissement crée une notification in-app aux propriétaires et gestionnaires. L’inventaire applique la recette configurée uniquement : un plat sans recette ne consomme rien, une cible absente ne produit aucun pourcentage et le système n’invente pas de niveaux de stock. Les messages de rareté côté client restent désactivés tant que les données d’inventaire ne sont pas fiables.

## Déploiement et validation

Les migrations de ce périmètre sont `0156_direct_menu_order_status_and_cancellation.sql`, `0157_customer_acquisition_costs.sql`, `0158_menu_featured_items.sql`, `0159_order_stock_deduction_and_low_stock_notifications.sql`, `0160_orderable_guard_after_price_options.sql` et `0161_fix_inventory_alert_row_trigger.sql`. Les deux dernières sont des garde-fous idempotents : elles réalignent un staging où la migration de prix était déjà appliquée et rétablissent le déclencheur SQL par ligne. Les deux bases consignent `0161`. Le scénario synthétique staging confirme la consommation idempotente, l’alerte à 30 % et la restitution avant service; l’E2E public confirme la création du lien et la commande à récupérer sur place. Le web est publié en production. Le build iOS `1.0.0 (15)` est `VALID`, assigné aux groupes interne et externe, et sa révision bêta externe est `APPROVED`. Aucun test d’installation sur iPhone physique n’a été réalisé.
