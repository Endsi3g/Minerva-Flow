# Release candidate — Minerva Flow 2.48.0

**État : candidat web `2.48.0` — dernier changement commis `94776e2` sur `release/2.48.0`; Preview `dpl_71oMfaUwtuDU2ynA9ncvV5ojX8Hx` READY pour ce SHA, mais les modifications actuelles sont locales et non déployées. Production toujours sur `main` au SHA `f969e15`; aucune promotion, aucun tag ni email envoyé. La migration Stripe V2 est appliquée au staging et Paramètres est accessible aux propriétaires/gestionnaires; restent le paiement complet avec destinataire activé et les autres contrôles ci-dessous. L’application iOS suit une release séparée.**
Date de préparation : 2026-09-24.
Dernière vérification : 2026-09-25.
Branche `release/2.48.0`, HEAD actuel `94776e2`; paquet web `2.48.0`.

### Actions de livraison encore ouvertes — 2026-09-25

- [ ] Web production : revoir les changements locaux non commités, retenir un périmètre cohérent, produire le commit candidat, vérifier un nouveau Preview sur ce SHA et les parcours/visuels, puis promouvoir en production et vérifier `minervaflow.app` / `www.minervaflow.app`. Aucun déploiement production de ces changements n’a été lancé.
- [ ] iOS/TestFlight : actualiser l’app native et préparer le build suivant (`1.0.0`, build `12` proposé après confirmation/incrément), retenter XCTest sur un runner stable, exécuter `bash ~/.Codex/hooks/app-store-compliance-guard.sh native/ios`, valider archive et dSYM, téléverser puis confirmer l’accès testeur externe. Le build courant reste `1.0 (11)`.
- [ ] Après ces validations, finaliser le changelog/release et l’envoi de courriel aux utilisateurs consentants; aucune notification n’a été envoyée.
- [x] Rebuild local de diagnostic : `npx next build --webpack --debug` a compilé en 71 s, terminé TypeScript en 13 s, généré 328 routes et quitté avec code 0. Des messages `cookies` marquent des routes authentifiées comme dynamiques; aucun envoi de source maps n’a été exécuté localement. Le processus est lent, mais n’est pas resté bloqué.

## Sorties envisagées

| Cible | Sortie proposée | État |
| --- | --- | --- |
| Web | `2.48.0` | Preview `dpl_71oMfaUwtuDU2ynA9ncvV5ojX8Hx` READY pour le commit applicatif `94776e2`; production reste sur `main`/`f969e15` |
| iOS / TestFlight | `1.0 (11)` | Build actuel en test interne/externe (8 testeurs); il ne contient pas les changements source de cette candidate; prochain build requis |
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

Capture issue du vrai parcours public de demande traiteur, vérifié sur staging avec données synthétiques nettoyées. Les vues mobiles sont aussi conservées dans `docs/screenshots/changelog-2.48.0-catering-success-mobile.png` et [confirmation de précommande](../screenshots/changelog-2.48.0-preorder-success-mobile.png). Avant la GitHub Release, joindre une capture desktop en asset image à la release publiée afin que le workflow alimente le changelog applicatif.

## Gates avant publication

- [x] Vérifier staging et production en lecture seule : `public.restaurants`, les tables/colonnes requises pour commandes, ambassadeurs et UGC, les fonctions RPC et `profiles.product_updates_opt_in DEFAULT false` sont présents. Les historiques distants sont horodatés et divergents des noms numérotés locaux; aucune migration en double ni entrée d’historique n’a été ajoutée.
- [x] E2E staging : 6/6 réussis — précommande planifiée payée à la cueillette, suggestion/vote et brouillon owner, devis traiteur sur place/livraison, demande owner et conversion idempotente d’un devis payé; fixtures synthétiques nettoyées.
- [x] Accounts v2 Recipient ajouté pour les nouvelles connexions restaurant, avec conservation des comptes Express v1; migration additive 0150 appliquée et colonnes vérifiées sur le staging autorisé. Historique Supabase distant horodaté divergent : SQL ciblé utilisé à la place de `db push`.
- [x] Smoke Stripe test-mode : création du destinataire synthétique, création du lien d’onboarding hébergé et lecture d’état; URL gardée secrète et compte fermé après le test.
- [ ] Valider Checkout/PaymentIntent et les reprises avec un compte Connect test dont les capacités transfert/payout sont actives. Aucun paiement en ligne complet n’est confirmé; le test précédent a été refusé (`insufficient_capabilities_for_transfer`). Le Preview utilise les ressources Supabase de production, donc aucun paiement n’y est lancé.
- [ ] Vérifier les flux POS réels et compléter les tests UI natifs.
- [x] Captures réelles E2E ajoutées : confirmation de devis traiteur desktop/mobile et confirmation de précommande mobile à 390 px.
- [x] Corriger le défaut Auth causé par `profiles.product_updates_opt_in` NOT NULL sans défaut dans le trigger d’inscription; migration `0149_signup_product_updates_default_false.sql` appliquée au staging autorisé, inscription owner et test devis staging réussis.
- [ ] Joindre la capture finale PNG/JPG/WebP/GIF comme asset de la GitHub Release; le workflow la publie dans `changelog_entries.image_url` et refuse une release sans capture.
- [x] Build web local précédent terminé (preuve historique); la vérification actuelle est détaillée ci-dessus. L’envoi des source maps depuis un build Vercel authentifié reste à prouver.
- [x] Parcours Auth et onboarding ciblés sur staging : inscription immédiate, rejet du doublon, connexion confirmée, préférence produit décochée par défaut, déclencheur Auth sans métadonnée de consentement et onboarding complet réussis.
- [x] Navigation essentielle mise à jour et testée sur staging : Workspace, Fournisseurs, Inventaire et Commandes, plus Paramètres owner/manager requis par les intégrations; Menu, Fidélisation et les autres routes produit restent redirigées vers Workspace.
- [x] Preview du commit applicatif `94776e2` inspecté : READY et SHA exact confirmé dans les métadonnées Vercel. La protection Vercel bloque l’accès public aux pages Preview; les tests Auth/navigation restent exécutés sur staging local.
- [ ] Vérifier les parcours E2E authentifiés sur le Preview. Le garde-fou `e2e/test-env.ts` refuse explicitement les tests navigateur hors de l’app locale tant qu’un environnement Preview isolé et vérifié n’est pas configuré; ne pas contourner cette protection.
- [ ] Faire la revue manuelle de tous les écrans sur le Preview, au clavier/zoom et sur mobile, avant promotion en production.
- [x] Compiler l’application, vérifier l’UUID du dSYM Sentry, téléverser l’archive `1.0 (11)` et confirmer son traitement par Apple.
- [ ] Relancer XCTest sur un runner stable : la compilation Simulator est réussie, mais les dernières tentatives XCTest n’ont produit aucun résultat confirmé.
- [x] Enregistrer les notes de test et de review, la politique de confidentialité, et les identifiants vérifiés du compte démo dans App Store Connect.
- [x] Assigner le build 11 au groupe externe et soumettre à l’examen bêta avec notification automatique; Apple affiche le build « En cours de test » dans le groupe externe (8 testeurs). Lien public vérifié HTTP 200 : https://testflight.apple.com/join/xGr45uuF.
- [x] Audit App Store statique du 2026-09-24 : 0 risque critique, 0 élevé et 2 avertissements; les contrôles manuels de publication publique (captures, déclarations de confidentialité, accords et métadonnées) restent ouverts.
- [ ] Vérifier la parité des descriptions publiées avec les capacités réellement activées chez chaque restaurant.
- [ ] Ne créer une release GitHub publiée qu’après validation des parcours restants et d’un build aligné sur le commit; `.github/workflows/publish-release.yml` publie l’entrée de changelog et déclenche les notifications associées.

## État des vérifications au 2026-09-24

- 335 tests unitaires (58 fichiers), lint ciblé passent. Le contrôle allowlist `nav-items` compte 25 tests. Six E2E staging couvrant commande, fidélité/suggestion et devis passent; la reprise précommande/production traiteur réussit (2/2), et l’E2E Paramètres/Intégrations owner réussit (1/1) avec le garde final, CTA vérifié desktop/mobile. `tsc --noEmit` est actuellement bloqué par une ligne tronquée dans le fichier de types Next généré `.next/dev/types/validator.ts`; la génération `next typegen` reproduit le problème. Le fixture E2E et son utilisateur ont été vérifiés absents du staging après nettoyage. Aucun paiement Stripe Connect complet n’est confirmé faute de compte destinataire de test actif.
- Le lint global reste non concluant : ESLint parcourt aussi des répertoires générés/nichés et signale des milliers d’erreurs; le lint ciblé sur les fichiers modifiés de cette phase passe.
- L’audit statique App Store indique 0 risque critique et 0 risque élevé; les contrôles manuels pour la publication publique restent ouverts.
- Aucune commande Docker n’a été relancée. Le build TestFlight `1.0 (11)` est actif en externe et son lien public répond HTTP 200; il ne contient pas cette candidate. Le commit `246061f` est poussé sur `release/2.48.0`; le Preview de cette branche est READY et la racine répond `307`, la page de connexion `200`, mais le SHA du déploiement n’a pas été confirmé explicitement. Aucun nouveau build iOS n’a été téléversé; aucune GitHub Release/notification utilisateur n’a été émise.
- Compilation iOS Simulator réussie pour le changement. Une tentative XCTest ciblée a été interrompue après environ 55 secondes, bloquée dans le nettoyage du runner Xcode; aucun résultat XCTest n’est confirmé pour cette tentative.
- **Décision : NOT READY pour la production ou TestFlight.** Restent Checkout/réessai Stripe avec un compte connecté actif, POS E2E, XCTest stable, nouveau Preview exact, revue manuelle complète de ce Preview, vérifications App Store manuelles et build iOS aligné avec le futur commit.
