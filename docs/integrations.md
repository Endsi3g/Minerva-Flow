# Intégrations — état actuel et marche à suivre

Ce document est pour vous (l'opérateur du projet), pas pour un restaurateur qui utilise l'app — le guide destiné aux restaurateurs est déjà dans l'app à `/guide`. Ici : quoi est branché, quoi ne l'est pas, et exactement quoi faire pour compléter chaque intégration.

Toutes les variables sont à ajouter avec :

```bash
vercel env add NOM_DE_LA_VARIABLE production   # puis preview, puis development si utile en local
```

Un secret utilisé côté GitHub Actions (webhook, cron externe) s'ajoute plutôt avec :

```bash
gh secret set NOM_DU_SECRET --body "valeur"
```

Après tout ajout de variable, la variable doit aussi être ajoutée à `.env.local` pour tester en local, et Vercel redéploiera automatiquement les prochaines requêtes avec la nouvelle valeur (pas besoin de redéployer manuellement).

---

## Vue d'ensemble

| Intégration | Statut | Ce qui manque |
|---|---|---|
| Supabase (base de données, auth) | ✅ Configuré | — |
| Resend — courriels transactionnels (invitations) | ✅ Configuré (domaine sandbox) | Domaine vérifié pour sortir du sandbox |
| Resend — campagnes email (annonces de mise à jour) | ⏸️ Bloqué par Resend | Même domaine vérifié que ci-dessus |
| Notifications push (Web Push/VAPID) | ✅ Configuré | — |
| Square (point de vente) | ✅ Configuré | — |
| Google Places (fiches établissement) | ✅ Configuré | — |
| Google Ads / Google Workspace / Google Calendar | ❌ Pas configuré | Créer une app OAuth Google Cloud |
| Meta Ads | ❌ Pas configuré | Créer une app Meta for Developers |
| Vercel AI Gateway (Chat IA, Revue IA) | ⏸️ Clé créée, bloquée | Ajouter une carte de crédit au compte Vercel |
| Stripe (facturation) | ⏸️ Différé volontairement | À activer quand vous le demandez |
| OpenTable | ❌ Pas configuré | Candidature de partenariat OpenTable Connect |
| Resy | ❌ Pas configuré | Candidature de partenariat Resy API |
| Uber Direct / Uber Eats | ❌ Pas configuré | Compte marchand Uber Direct |
| Supabase Preview Branching | ⏸️ Bloqué | Palier de forfait Supabase supérieur |

Légende : ✅ prêt · ⏸️ prêt côté code, bloqué par une action externe · ❌ rien de configuré encore

---

## 1. Resend — domaine d'envoi vérifié (le plus rentable à débloquer en premier)

**Pourquoi ça compte** : tant que ce n'est pas fait, les invitations d'équipe partent de l'adresse partagée `onboarding@resend.dev` (peu professionnel, parfois filtré comme indésirable), et **la campagne email des mises à jour ne peut littéralement pas s'envoyer** — Resend refuse tout Broadcast, même en brouillon, depuis ce domaine sandbox.

**Étapes** :
1. Choisir un sous-domaine à dédier à l'envoi, p. ex. `mail.flowparminerva.com` ou `notifications.flowparminerva.com` (jamais votre domaine racine directement — un sous-domaine isole la réputation d'envoi).
2. Dans le [dashboard Resend](https://resend.com/domains) → **Add Domain** → entrer ce sous-domaine.
3. Resend affiche 3-4 enregistrements DNS (SPF, DKIM, parfois DMARC) à ajouter chez votre registrar/hébergeur DNS. Les copier tels quels.
4. Une fois les enregistrements propagés (quelques minutes à quelques heures), cliquer **Verify** dans Resend.
5. Une fois vérifié :
   ```bash
   vercel env add RESEND_FROM_EMAIL production
   # valeur : Flow par Minerva <notifications@mail.flowparminerva.com>
   ```
6. Rien d'autre à changer côté code — `lib/email/resend.ts` lit déjà `RESEND_FROM_EMAIL` et bascule automatiquement dessus. La prochaine release publiée déclenchera la première vraie campagne email.

---

## 2. Google (Places déjà actif ; Ads/Workspace/Calendar à faire)

**Google Places** (recherche d'adresse à la création d'un établissement) fonctionne déjà — `GOOGLE_PLACES_API_KEY` est configuré.

**Google Ads, Google Workspace (Gmail/Sheets/Drive/Calendar) et Calendrier personnel** partagent tous la même app OAuth, pas encore créée :

1. [Google Cloud Console](https://console.cloud.google.com/) → créer un projet (ou réutiliser celui du Places API key).
2. **APIs & Services → OAuth consent screen** → configurer (nom de l'app "Flow par Minerva", logo, domaine de contact).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type "Web application".
4. Ajouter ces URIs de redirection autorisées (remplacer le domaine par le vôtre en production) :
   - `https://minerva-flow.vercel.app/api/oauth/google/callback`
   - `https://minerva-flow.vercel.app/api/oauth/google-workspace/callback`
   - `https://minerva-flow.vercel.app/api/oauth/google-calendar/callback`
5. Activer les APIs nécessaires dans le projet : Google Ads API, Gmail API, Google Sheets API, Google Drive API, Google Calendar API, Google Analytics Data API.
6. Récupérer le Client ID et le Client Secret, puis :
   ```bash
   vercel env add GOOGLE_CLIENT_ID production
   vercel env add GOOGLE_CLIENT_SECRET production
   ```
7. Tant que l'app OAuth consent screen reste en mode "Testing", seuls les comptes Google explicitement ajoutés comme testeurs pourront se connecter — publier l'app (ou rester en Testing avec vos comptes pilotes ajoutés) selon où vous en êtes.

---

## 3. Meta Ads

1. [Meta for Developers](https://developers.facebook.com/) → **My Apps → Create App** → type "Business".
2. Ajouter le produit **Marketing API**.
3. **App Settings → Basic** → récupérer l'App ID et l'App Secret.
4. **App Settings → Basic → Add Platform → Website**, puis dans les paramètres OAuth valides, ajouter :
   - `https://minerva-flow.vercel.app/api/oauth/meta/callback`
5. Tant que l'app reste en mode développement, seuls les comptes ajoutés comme "Testeurs" (Roles → Roles) pourront se connecter — passer en mode Live nécessite une révision Meta si vous voulez que n'importe quel restaurateur connecte son propre compte publicitaire.
6. Ajouter les variables :
   ```bash
   vercel env add META_APP_ID production
   vercel env add META_APP_SECRET production
   ```

---

## 4. Vercel AI Gateway (Chat IA, Revue IA générée)

La clé API (`AI_GATEWAY_API_KEY`) est déjà créée et configurée dans les trois environnements Vercel, avec un budget plafonné à 20 $/mois. **Le seul blocage restant** :

1. Aller dans les paramètres de facturation de l'équipe Vercel (`endsi3gs-projects`) → **Billing**.
2. Ajouter une carte de crédit valide — Vercel AI Gateway exige une carte au dossier avant de servir la moindre requête, même sous le plafond budgétaire déjà fixé.

Rien d'autre à faire ensuite — le Chat IA et les revues de performance IA s'activeront automatiquement dès que la carte est ajoutée.

---

## 5. Stripe (facturation par abonnement)

Différé volontairement — pas encore de demande de votre part pour l'activer. Quand vous voudrez :

1. [Dashboard Stripe](https://dashboard.stripe.com/) → créer un produit "Flow par Minerva — Abonnement mensuel" avec un prix récurrent.
2. Récupérer la clé secrète (**Developers → API keys**) et l'ID du prix créé.
3. **Developers → Webhooks → Add endpoint** → `https://minerva-flow.vercel.app/api/stripe/webhook`, sélectionner les événements d'abonnement (`customer.subscription.*`, `invoice.*`).
4. Ajouter les trois variables :
   ```bash
   vercel env add STRIPE_SECRET_KEY production
   vercel env add STRIPE_PRICE_ID production
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

Dites-moi simplement quand vous voulez l'activer et je m'occupe du reste une fois ces trois valeurs en main.

---

## 6. OpenTable, Resy, Uber Direct/Eats

Aucune des trois n'a d'inscription libre-service — contrairement à Square/Google/Meta, il n'y a pas de "créer une app" en 5 minutes. La carte **Paramètres → Intégrations → Réservations & livraison tierces** existe déjà dans l'app pour recevoir les identifiants une fois obtenus, mais la démarche business doit se faire en dehors du code :

- **OpenTable Connect** — [opentable.com/restaurant-solutions](https://www.opentable.com/restaurant-solutions) → contacter les ventes / remplir le formulaire de demande de partenariat. L'accès à l'API GuestCenter est accordé restaurant par restaurant après approbation.
- **Resy API** — [resy.com/for-restaurants](https://resy.com/for-restaurants) → même principe, accès API accordé au cas par cas après discussion avec leur équipe partenaires.
- **Uber Direct** — [business.uber.com/en-US/direct](https://business.uber.com/en-US/direct/) → créer un compte marchand Uber Direct (plus accessible que les deux précédents — pas un partenariat exclusif, mais un compte business à ouvrir). Une fois le compte actif, les identifiants API sont disponibles en libre-service dans leur tableau de bord développeur.

Une fois que vous avez un identifiant de compte + une clé API pour l'un des trois, entrez-les directement dans la carte d'intégration correspondante dans l'app — ils sont stockés chiffrés (Supabase Vault), jamais en clair. Je n'ai pas écrit de logique de synchronisation réelle (récupération des réservations, envoi vers Uber Direct, etc.) parce que je n'ai pas accès à leur documentation API réelle tant que le partenariat n'est pas approuvé — une fois les identifiants en main, partagez-moi aussi la documentation fournie et je câble la synchronisation contre la vraie API plutôt que de deviner sa forme.

---

## 7. Supabase Preview Branching

Bloqué par le palier de forfait Supabase actuel, pas par une mauvaise configuration — passer à un forfait supérieur (Pro ou plus, selon l'offre au moment où vous lisez ceci) débloque cette fonctionnalité directement dans le dashboard Supabase, aucun changement de code requis de notre côté.

---

## Secrets déjà en place (pour référence, pas d'action requise)

| Variable | Rôle |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connexion à la base de données |
| `CRON_SECRET` | Protège les routes `/api/cron/*` (rapports hebdo, retards de quart) |
| `RELEASE_WEBHOOK_SECRET` | Protège `/api/system/publish-release`, appelé par `.github/workflows/publish-release.yml` à chaque release GitHub publiée |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Notifications push (Web Push), déjà actives sur mobile et ordinateur |
| `SQUARE_APPLICATION_ID` / `SQUARE_APPLICATION_SECRET` / `SQUARE_ENVIRONMENT` / `SQUARE_WEBHOOK_*` | Synchronisation des ventes Square |
| `GOOGLE_PLACES_API_KEY` | Recherche d'adresse à la création d'un établissement |

---

## Migrations Supabase

Rappel du fonctionnement déjà en place pour ce projet : aucun accès direct à la base de données depuis ici. Chaque fichier sous `supabase/migrations/*.sql` doit être copié-collé dans l'éditeur SQL du dashboard Supabase et exécuté manuellement, dans l'ordre numérique, avant que le code qui en dépend fonctionne en production.
