# Release candidate — Minerva Flow 2.48.0

**État : candidat web `2.48.0` — build local terminé; déploiement Preview final et validation sur ce déploiement requis avant la promotion production. L’application iOS `1.0 (11)` suit une release séparée.**
Date de préparation : 2026-09-24.
Base web actuelle : `2.47.1`. La version proposée reste à confirmer au moment du gel de release.

## Sorties envisagées

| Cible | Sortie proposée | État |
| --- | --- | --- |
| Web | `2.48.0` | Version du paquet fixée; build de production local terminé; Preview final à valider avant promotion |
| iOS / TestFlight | `1.0 (11)` | En cours de test dans les groupes interne et externe; 8 testeurs externes; lien public vérifié HTTP 200 |
| GitHub Release + changelog | `v2.48.0` | Notes FR/EN préparées; publication bloquée jusqu’à la capture réelle jointe comme asset |
| Android / Google Play | Aucune | Aucun projet Android ni pipeline Android trouvé dans le dépôt |

## Notes de version — français

### Précommandes, commandes et service traiteur

- Planifiez une commande à l’avance avec un créneau de préparation, cueillette ou livraison.
- Demandez un repas personnalisé ou un service traiteur, puis recevez un devis détaillé à confirmer par le restaurant.
- Réglez le devis en ligne; une commande de production est créée après confirmation du paiement.
- Les suggestions de repas des clients sont regroupées pour aider l’équipe à décider quoi ajouter au menu.

### Fidélisation et expérience mobile

- Les clients peuvent consulter leur fidélité et retrouver leurs offres d’anniversaire dans l’application.
- L’équipe peut rechercher un client au comptoir par téléphone et confirmer son identité avant d’associer les points.
- Le rapprochement des achats POS et des points reste dépendant de la connexion POS active de chaque restaurant.

### Fiabilité

- Les tentatives de commande web et mobile gardent la même commande et la même clé durable; une session Stripe encore ouverte est réutilisée, tandis qu’une session expirée reçoit une nouvelle session avec une clé de reprise déterministe.
- Stripe peut créer un nouveau PaymentIntent pour cette nouvelle session expirée; l’identité de la commande Minerva Flow reste la même et l’ancienne session expirée ne peut plus être payée.
- Les notifications de conversion d’un devis payé sont protégées contre les webhooks Stripe répétés.
- Une fermeture de flux de rendu Next.js due au client (`The destination stream closed early.`) reste visible dans Sentry sans être présentée comme une panne critique dans l’email d’alerte.

## Release notes — English

### Preorders, ordering, and catering

- Schedule an order ahead for preparation, pickup, or delivery.
- Request a custom meal or catering service and receive an itemized quote to approve with the restaurant.
- Pay an approved quote online; a production order is created after payment confirmation.
- Customer meal suggestions are grouped to help restaurant teams decide what to add to the menu.

### Loyalty and mobile experience

- Customers can review their loyalty progress and birthday offers in the app.
- Staff can find a customer by phone and confirm their identity before associating loyalty points.
- POS purchase-to-points matching still depends on each restaurant's active POS connection.

### Reliability

- Web and mobile retries keep the same durable app order; an active Stripe session is reused, while an expired one receives a replacement session with a deterministic retry key.
- Stripe may create a new PaymentIntent for the replacement session; the Minerva Flow order identity remains unchanged, and the expired Checkout session can no longer be paid.
- Paid-quote conversion notifications are protected against repeated Stripe webhook delivery.
- A client-closed Next.js render stream (`The destination stream closed early.`) remains visible in Sentry without being mislabeled as a critical email alert.

## Changelog screenshot

![Confirmation réelle d’une demande de devis traiteur après E2E staging, capture desktop sans données de contact](../screenshots/changelog-2.48.0-catering-success.png)

Capture issue du vrai parcours public de demande traiteur, vérifié sur staging avec données synthétiques nettoyées. La version mobile est aussi jointe dans `docs/screenshots/changelog-2.48.0-catering-success-mobile.png`. Avant la GitHub Release, joindre la capture desktop en asset image à la release publiée afin que le workflow alimente le changelog applicatif.

## Gates avant publication

- [x] Vérifier staging et production en lecture seule : `public.restaurants`, les tables/colonnes requises pour commandes, ambassadeurs et UGC, les fonctions RPC et `profiles.product_updates_opt_in DEFAULT false` sont présents. Les historiques distants sont horodatés et divergents des noms numérotés locaux; aucune migration en double ni entrée d’historique n’a été ajoutée.
- [x] E2E staging public traiteur (demande sur place et livraison) et conversion de devis en commande avec protection idempotente : 3 tests distincts réussis; données synthétiques nettoyées et vérifiées.
- [ ] Exécuter les parcours staging de précommande/commande client, reprise après expiration d’une session Stripe réelle en mode test, et vérification du tableau propriétaire.
- [x] Capture de confirmation client desktop/mobile ajoutée à ce changelog depuis l’E2E staging.
- [x] Corriger le défaut Auth causé par `profiles.product_updates_opt_in` NOT NULL sans défaut dans le trigger d’inscription; migration `0149_signup_product_updates_default_false.sql` appliquée au staging autorisé, inscription owner et test devis staging réussis.
- [ ] Joindre la capture finale PNG/JPG/WebP/GIF comme asset de la GitHub Release; le workflow la publie dans `changelog_entries.image_url` et refuse une release sans capture.
- [x] Build web local de production terminé : compilation Turbopack, upload Sentry, vérification TypeScript et génération des 328 pages statiques réussis.
- [x] Parcours Auth et onboarding ciblés sur staging : inscription immédiate, rejet du doublon, connexion confirmée, préférence produit décochée par défaut, déclencheur Auth sans métadonnée de consentement et onboarding complet réussis.
- [x] Accès applicatif vérifié après le verrouillage : seuls Workspace, Fournisseurs, Inventaire et Commandes restent dans la navigation; les accès directs à `/menu`, `/fidelisation` et aux autres pages redirigent vers Workspace.
- [ ] Générer et vérifier le Preview correspondant au commit final avant promotion en production.
- [x] Compiler l’application, vérifier l’UUID du dSYM Sentry, téléverser l’archive `1.0 (11)` et confirmer son traitement par Apple.
- [x] Exécuter les tests UI ciblés sur iPhone 17 Pro Simulator : checkout direct après ajout et page Scanner (2/2 réussis).
- [x] Enregistrer les notes de test et de review, la politique de confidentialité, et les identifiants vérifiés du compte démo dans App Store Connect.
- [x] Assigner le build 11 au groupe externe et soumettre à l’examen bêta avec notification automatique; Apple affiche le build « En cours de test » dans le groupe externe (8 testeurs). Lien public vérifié HTTP 200 : https://testflight.apple.com/join/xGr45uuF.
- [x] Audit App Store statique du 2026-09-24 : 0 risque critique, 0 élevé et 2 avertissements; les contrôles manuels de publication publique (captures, déclarations de confidentialité, accords et métadonnées) restent ouverts.
- [ ] Vérifier la parité des descriptions publiées avec les capacités réellement activées chez chaque restaurant.
- [ ] Ne créer une release GitHub publiée qu’après validation des parcours restants et d’un build aligné sur le commit; `.github/workflows/publish-release.yml` publie l’entrée de changelog et déclenche les notifications associées.

## État des vérifications au 2026-09-24

- 321 tests unitaires passent dans la vérification précédente; le contrôle nav-items (23 tests) et TypeScript passent sur cet état; le build local de production passe; les tests iOS ciblés passent (2/2); 3 parcours E2E staging distincts passent, avec un quatrième passage de capture.
- Le lint global reste en échec sur des erreurs réparties dans plusieurs zones du dépôt; le lint ciblé sur les fichiers modifiés de cette phase passe.
- Les parcours Auth, préférences, onboarding et navigation ont été exercés sur staging. Un rerun combiné plus tard a perdu son serveur local (arrêt du processus; les requêtes suivantes ont répondu `ERR_CONNECTION_REFUSED`); ces résultats sont exclus. Le test final isolé du verrouillage de navigation passe (1/1).
- L’audit statique App Store indique 0 risque critique et 0 risque élevé; les contrôles manuels pour la publication publique restent ouverts.
- Aucune commande Docker n’a été relancée. Le build TestFlight `1.0 (11)` est actif en externe et son lien public répond HTTP 200. Le commit `bb25ec8` (journal des mises à jour iOS) est poussé sur `main`; le déploiement Vercel associé `dpl_2G2kSTuTUECJ1LAH52H75kizmx59` est `READY` et la racine répond `307`. Le build TestFlight actif ne contient pas ce changement; aucun nouvel upload iOS ni GitHub Release n’a été effectué.
- Compilation iOS Simulator réussie pour le changement. Une tentative XCTest ciblée a été interrompue après environ 55 secondes, bloquée dans le nettoyage du runner Xcode; aucun résultat XCTest n’est confirmé pour cette tentative.
- **Décision web : NOT READY pour la promotion tant que le Preview du commit final n’a pas été inspecté.** Les vérifications manuelles Apple restent distinctes et ne sont pas couvertes par cette release web.
