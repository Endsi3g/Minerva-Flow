# HANDOFF — Minerva Flow

Ce fichier suit ce qui reste à faire sur le compte démo / l'application, au-delà du travail déjà livré. Mis à jour à chaque session — si un point est réglé, déplacez-le dans "Fait" avec la date plutôt que de le supprimer (garde une trace).

## À faire — priorité produit

### 1. Paiement en ligne depuis le portail (paiement sur place déjà livré)
Le client peut maintenant commander depuis son portail — la commande arrive directement dans `/commandes` (statut « Soumise »), exactement comme une commande QR-code à table. Le paiement se fait sur place (`payment_status: 'non_requis'`) ; voir "Fait récemment" plus bas pour le détail.

Ce qui reste : le paiement **en ligne** au moment de la commande. L'infra existe déjà côté `/m/[token]` (Stripe Connect par restaurant — `createOrderPaymentIntent`, `submitPublicOrder`) mais n'est pas branchée sur `/portal` ; ça demande que le restaurant ait complété l'onboarding Stripe Connect (compte séparé de la facturation Minerva elle-même, qui reste non configurée — voir mémoire `project-stripe-deferred`).

**État réel de l'infra POS existante** (pour un vrai lien vers la caisse du restaurant, distinct du paiement en ligne ci-dessus) :
- Square : OAuth + sync réels, mais **revenu total du jour seulement** — aucun détail ligne par ligne, aucun mapping catalogue Square ↔ menu Flow. Clés `SQUARE_APPLICATION_ID/SECRET` non configurées.
- Lightspeed : code OAuth + sync écrit (`lib/pos/lightspeed.ts`, `app/api/oauth/lightspeed/`) mais **jamais testé contre un vrai compte** — clés `LIGHTSPEED_*` non configurées, donc rien n'a pu être vérifié de bout en bout.
- Clover : aucun code, uniquement une ligne désactivée dans l'UI (`PosConnectionsCard.tsx`).
- Stripe (paiement en ligne général) : intentionnellement pas configuré — voir mémoire `project-stripe-deferred`, décision de l'utilisateur de reporter la facturation.

### 2. Carte de fidélité Apple Wallet
Carte numérique avec code QR que le client ajoute à son Apple Wallet ; scanné en caisse, ça lie le code au compte client et crédite les points automatiquement au paiement — objectif : offrir aux petits restos/cafés le même genre de système de fidélité que McDonald's/Tim Hortons, à moindre coût.

**Pourquoi ce n'est pas fait** : demande une intégration Apple PassKit (génération de `.pkpass`, certificat Apple Developer) + un lien avec le système de paiement du POS (même dépendance que le point 1 ci-dessus — sans lien POS, scanner le code ne peut pas déclencher l'attribution de points au moment du paiement). Décision de l'utilisateur (2026-08-24) : scoper séparément plus tard.

## Bugs connus, non corrigés

- **Avertissement React "same key" observé sur /support** : deux entrées avec le même id apparaissent dans une liste (notifications ou alertes de la topbar) lors d'un refetch — vu deux fois dans les logs du serveur de dev (2026-08-24), jamais reproduit de façon fiable, cause probable : une course entre le fetch initial et un refetch déclenché par Realtime. N'affecte pas la fonctionnalité (juste un avertissement dev), mais à investiguer si ça revient.

- **`handle_new_user()` (trigger Postgres) ne crée pas de restaurant par défaut** pour un utilisateur créé via `admin.auth.admin.createUser()` — crée seulement `profiles` + `notification_preferences`. Trouvé en testant l'onboarding (2026-08-24), jamais corrigé — cause racine distincte du travail en cours à ce moment-là, hors scope à l'époque.
- **Courriels en broadcast (annonces de changelog) bloqués** : Resend refuse tout Broadcast envoyé depuis le domaine sandbox partagé (`onboarding@resend.dev`) — confirmé en testant un envoi réel (2026-08-24). Aucun courriel d'annonce de mise à jour ne peut partir tant qu'un domaine vérifié n'est pas configuré (`RESEND_FROM_EMAIL`). Les courriels transactionnels un-à-un (invitations, relances clients) fonctionnent déjà normalement — seuls les Broadcasts à toute la plateforme sont bloqués.
- **SMS (Twilio)** : toujours aucun compte configuré — le canal SMS du moteur de rétention reste en attente silencieuse (tombe simplement au canal suivant).

## Bloqué (hors de notre contrôle)

- **Supabase Preview Branching** : bloqué par le palier tarifaire du projet Supabase (fonctionnalité payante) — voir mémoire `project-supabase-preview-branching-blocked`. Ne pas retenter de configurer sans confirmation que le plan a été mis à niveau.

## Fait récemment (pour contexte, pas une liste exhaustive)

- 2026-08-24 — **Commande depuis le portail client (paiement sur place)** : le menu du portail a maintenant un panier (+/-, résumé, pourboire) et un vrai bouton « Envoyer la commande » — réutilise `computeOrderPricing`/`getRestaurantOrderSettings` déjà écrits pour `/m/[token]`. La commande est créée `soumise`/`non_requis` et apparaît immédiatement dans `/commandes`, staff reçoit une notification. Corrige au passage un bug pré-existant : le menu et les offres du portail ne s'affichaient jamais (RLS `is_restaurant_member` bloquait le client, silencieusement — la carte disparaissait au lieu d'une erreur) ; `getActiveMenuItemsForCustomers`/`getActiveOffersForCustomers` (client admin) remplacent les appels RLS-bloqués. Vérifié en live (Playwright, session magic-link réelle) : commande créée en base avec le bon sous-total/taxes/total, visible dans `/commandes`.
- 2026-08-24 — **Boîte à suggestions / sondage fonctionnalités** (`/support`) : sondage à choix (priorité entre les 2 grands chantiers en attente) + champ libre, chaque soumission enregistrée dans `feature_feedback` et envoyée par courriel à kbelceus776@gmail.com (courriel transactionnel, pas un Broadcast — fonctionne malgré le domaine Resend non vérifié). Vérifié en live : ligne enregistrée en base + courriel confirmé "delivered" via l'API Resend.
- 2026-08-24 — **Présence d'équipe dans la topbar** : pile d'avatars (Supabase Realtime Presence, un canal par restaurant) à gauche de la barre de recherche, tooltip montrant nom + page consultée ; les fiches plat/client publient un libellé précis ("Plat : Poutine") au lieu du nom générique de la page. Vérifié en live avec deux sessions simultanées.
- 2026-08-24 — Écosystème LTV : jauges circulaires, langage simplifié partout, guide démo qui ne floute plus la sidebar, page client dédiée + graphique de points, page plat dédiée + navigation précédent/suivant, menu dans le portail client, Impact devient actionnable (relancer un client en un clic), notifications palier de fidélité + dérive de marge + récompense disponible, recherche sidebar/topbar unifiée, bannière mobile corrigée. Voir l'historique de commits pour le détail complet.
