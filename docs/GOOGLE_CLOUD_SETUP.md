# Google Cloud Console — Guide Complet de Configuration pour Minerva Flow

Ce guide fournit la procédure pas-à-pas pour configurer l'ensemble des services **Google Cloud Platform (GCP)** requis par l'écosystème **Minerva Flow** :
1. **Google Wallet API** (Génération & signature des cartes de fidélité dématérialisées pour Android & Google Wallet)
2. **Google OAuth 2.0** (Connexion sociale « Continuer avec Google » dans Supabase Auth)
3. **Google Maps Platform** (Recherche d'adresses, autocomplétion des établissements et géolocalisation)
4. **Google Workspace & Calendar** (Synchronisation des réservations et exports de données)

---

## 1. Création du Projet GCP & Facturation

### Étape 1.1 — Connexion & Création du projet
1. Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Connectez-vous avec le compte administrateur Google de l'organisation (`admin@minervaflow.app` ou votre compte dédié).
3. Cliquez sur le sélecteur de projet en haut à gauche, puis sur **Nouveau projet**.
4. Définissez :
   - **Nom du projet** : `Minerva Flow Prod`
   - **ID du projet** : `minerva-flow-prod` (ou un identifiant unique généré)
   - **Organisation / Emplacement** : `minervaflow.app` (si vous utilisez Google Workspace) ou laissez vide.
5. Cliquez sur **Créer**.

### Étape 1.2 — Configuration du compte de facturation (Billing)
> [!IMPORTANT]
> Les APIs Google Maps et Google Cloud exigent un compte de facturation actif, même si l'utilisation reste dans le quota mensuel gratuit (ex. 200 $ de crédit mensuel gratuit sur Google Maps).

1. Allez dans le menu latéral ☰ > **Facturation** (Billing).
2. Associez un compte de facturation valide avec une carte bancaire d'entreprise.
3. Définissez une alerte budgétaire (Billing > Budgets et alertes) à 50 $ ou 100 $ pour éviter toute surprise liée à une hausse imprévue de trafic.

---

## 2. Google Wallet API — Cartes de Fidélité Dématérialisées

Minerva Flow génère dynamiquement des cartes de fidélité numériques Google Wallet signées par clé asymétrique RSA (JWT ES256/RS256) via `lib/wallet/`.

### Étape 2.1 — Activer la Google Wallet API
1. Dans la console GCP, allez dans **API et services** > **Bibliothèque**.
2. Recherchez `Google Wallet API`.
3. Cliquez sur **Activer**.

### Étape 2.2 — Créer le compte de service (Service Account)
1. Allez dans **IAM et administration** > **Comptes de service** (Service Accounts).
2. Cliquez sur **+ Créer un compte de service**.
3. Remplissez :
   - **Nom du compte** : `Minerva Flow Wallet Service`
   - **ID du compte** : `minerva-flow-wallet`
   - **Description** : `Service account pour la génération et signature des passes Google Wallet.`
4. Cliquez sur **Créer et continuer**, puis sur **Terminer** (aucun rôle GCP d'infrastructure n'est requis à ce stade).

### Étape 2.3 — Générer la clé privée RSA (.json)
1. Cliquez sur le compte de service nouvellement créé (`minerva-flow-wallet@minerva-flow-prod.iam.gserviceaccount.com`).
2. Allez dans l'onglet **Clés**.
3. Cliquez sur **Ajouter une clé** > **Créer une clé**.
4. Sélectionnez le type **JSON**, puis cliquez sur **Créer**.
5. Un fichier `.json` est téléchargé sur votre ordinateur.
   > [!WARNING]
   > Ne commitez JAMAIS ce fichier JSON dans Git. Il contient la clé privée RSA servant à signer cryptographiquement les cartes de fidélité.

### Étape 2.4 — Configurer la Google Pay & Wallet Business Console
1. Accédez à la [Google Pay & Wallet Business Console](https://pay.google.com/business/console).
2. Acceptez les conditions d'utilisation développeur.
3. Notez votre **Issuer ID** (Identifiant d'émetteur, généralement un identifiant numérique à 16-18 chiffres visible dans l'URL ou dans *Accès API*).
4. Allez dans l'onglet **Accès à l'API** (API Access) ou **Paramètres**.
5. Cliquez sur **Associer un compte de service** et collez l'adresse email de votre compte de service GCP :  
   `minerva-flow-wallet@minerva-flow-prod.iam.gserviceaccount.com`.
6. Attribuez-lui les droits d'**Administrateur** ou d'**Éditeur**.

### Étape 2.5 — Renseigner les variables d'environnement
Dans votre fichier `.env.local` et sur Vercel :

```bash
# Identifiant d'émetteur Google Wallet Business Console
GOOGLE_WALLET_ISSUER_ID="3388000000022211444"

# Email du Service Account GCP
GOOGLE_WALLET_CLIENT_EMAIL="minerva-flow-wallet@minerva-flow-prod.iam.gserviceaccount.com"

# Clé privée RSA extraite du fichier JSON (en remplaçant les sauts de ligne par \n)
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n"
```

---

## 3. Google OAuth 2.0 — Authentification Sociale (Supabase)

Permet aux restaurateurs, gérants et clients de se connecter en un clic avec leur compte Google.

### Étape 3.1 — Écran de consentement OAuth (OAuth Consent Screen)
1. Allez dans **API et services** > **Écran de consentement OAuth**.
2. Type d'utilisateur : Sélectionnez **Externe** (External), puis cliquez sur **Créer**.
3. Informations sur l'application :
   - **Nom de l'application** : `Minerva Flow` (Rappel : le terme « Flow par Minerva » est banni).
   - **Adresse e-mail d'assistance utilisateur** : `support@minervaflow.app`.
   - **Logo de l'application** : Téléchargez le logo officiel de Minerva Flow (disponible dans `public/`).
   - **Domaine de l'application** :
     - Page d'accueil : `https://minervaflow.app`
     - Règles de confidentialité : `https://minervaflow.app/legal/confidentialite`
     - Conditions d'utilisation : `https://minervaflow.app/legal/cgu`
   - **Domaines autorisés** : Ajoutez `minervaflow.app` et `supabase.co`.
   - **Coordonnées du développeur** : `admin@minervaflow.app`.
4. Champ d'application (Scopes) :
   - Cliquez sur **Ajouter ou supprimer des champs d'application**.
   - Cochez les 3 scopes standards :
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Cliquez sur **Mettre à jour**, puis **Enregistrer et continuer**.
5. Utilisateurs tests : En mode Test, ajoutez votre propre email pour tester avant vérification publique.

### Étape 3.2 — Création des Identifiants OAuth 2.0
1. Allez dans **API et services** > **Identifiants**.
2. Cliquez sur **+ Créer des identifiants** > **ID client OAuth**.
3. Type d'application : **Application Web**.
4. Nom : `Minerva Flow Web Client`.
5. **Origines JavaScript autorisées** :
   - `https://minervaflow.app`
   - `http://localhost:3000`
   - `http://localhost:3200`
6. **URI de redirection autorisés** :
   - Votre URL de callback Supabase :  
     `https://<VOTRE-PROJET-REF>.supabase.co/auth/v1/callback`
   - (Facultatif en local si vous utilisez Supabase CLI) : `http://localhost:54321/auth/v1/callback`
7. Cliquez sur **Créer**.
8. Une fenêtre s'affiche avec :
   - **ID client** (ex. `VOTRE_CLIENT_ID.apps.googleusercontent.com`)
   - **Code secret du client** (Client Secret)

### Étape 3.3 — Liaison dans la Console Supabase
1. Rendez-vous sur le [Dashboard Supabase](https://supabase.com/dashboard/project/_/auth/providers).
2. Sélectionnez votre projet Minerva Flow.
3. Allez dans **Authentication** > **Providers** > **Google**.
4. Activez le toggle **Enable Google provider**.
5. Collez votre **Client ID** et votre **Client Secret**.
6. Cliquez sur **Save**.

---

## 4. Google Maps Platform — Géolocalisation & Établissements

Utilisé pour l'affichage cartographique des restaurants partenaires, le calcul de distance, et la suggestion automatique d'adresses pour les nouveaux établissements.

### Étape 4.1 — Activer les APIs Google Maps
1. Dans la Google Cloud Console, allez dans **API et services** > **Bibliothèque**.
2. Recherchez et activez successivement les 3 APIs suivantes :
   - **Maps JavaScript API** (rendu de la carte interactive)
   - **Places API (New)** (recherche et fiches d'établissements)
   - **Geocoding API** (conversion adresses <-> coordonnées GPS lat/lng)

### Étape 4.2 — Générer et Restreindre la Clé API
1. Allez dans **API et services** > **Identifiants**.
2. Cliquez sur **+ Créer des identifiants** > **Clé API**.
3. Une clé est générée. Cliquez immédiatement sur **Modifier la clé** pour sécuriser son utilisation.
4. **Paramètres de sécurité essentiels** :
   - **Nom de la clé** : `Minerva Flow Maps Web Key`
   - **Restrictions relatives aux applications** :
     - Sélectionnez **Référents HTTP (sites Web)**.
     - Ajoutez les référents autorisés :
       - `https://minervaflow.app/*`
       - `https://*.minervaflow.app/*`
       - `http://localhost:3000/*`
       - `http://localhost:3200/*`
   - **Restrictions relatives aux API** :
     - Sélectionnez **Restreindre la clé**.
     - Cochez uniquement :
       - `Maps JavaScript API`
       - `Places API (New)`
       - `Geocoding API`
5. Cliquez sur **Enregistrer**.

### Étape 4.3 — Renseigner la variable d'environnement
Dans votre `.env.local` et sur Vercel :

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyA..."
```

---

## 5. Google Workspace & Calendar (Synchronisation Réservations)

Si l'établissement active l'intégration Google Calendar dans `Paramètres > Intégrations` :
1. Dans la Bibliothèque d'APIs GCP, activez :
   - **Google Calendar API**
2. Les utilisateurs se connectent via OAuth 2.0 avec le scope `https://www.googleapis.com/auth/calendar.events`.
3. Les jetons d'accès et jetons de rafraîchissement (*refresh tokens*) sont stockés de façon chiffrée dans Supabase.

---

## 6. Serveur MCP Google Pay & Wallet Developer (Antigravity & Claude)

Le serveur MCP officiel `google-pay-wallet-dev` permet aux agents IA (Claude Code, Antigravity IDE) d'accéder aux données développeur Google Pay & Wallet, d'auditer les classes de passes et de consulter la documentation officielle :

* **URL du serveur MCP distant** : `https://paydeveloper.googleapis.com/mcp`
* **Transport** : HTTP / SSE avec authentification OAuth 2.0
* **Scopes requis** :
  - `https://www.googleapis.com/auth/paydeveloper.merchant` (Gestion des données marchand Google Pay)
  - `https://www.googleapis.com/auth/paydeveloper.issuer.readonly` (Lecture des émetteurs et classes de passes Wallet)
* **Configuration Claude CLI** :
  ```bash
  MCP_CLIENT_SECRET="VOTRE_GOOGLE_CLIENT_SECRET" claude mcp add --transport http \
    --client-id "VOTRE_GOOGLE_CLIENT_ID.apps.googleusercontent.com" \
    --client-secret google-pay-wallet-dev https://paydeveloper.googleapis.com/mcp
  ```
* **Configuration Antigravity IDE** (`~/.gemini/config/mcp_config.json`) :
  ```json
  {
    "mcpServers": {
      "google-pay-wallet-dev": {
        "serverUrl": "https://paydeveloper.googleapis.com/mcp",
        "oauth": {
          "clientId": "VOTRE_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          "clientSecret": "VOTRE_GOOGLE_CLIENT_SECRET"
        }
      }
    }
  }
  ```

---

## 7. Synthèse des Variables d'Environnement (.env)

Voici le récapitulatif complet des variables liées à Google Cloud pour Minerva Flow :

| Variable | Visibilité | Rôle | Configuration |
|---|---|---|---|
| `GOOGLE_WALLET_ISSUER_ID` | Serveur | ID émetteur Google Pay Business Console | Configuré dans `.env.local` / Vercel |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` | Serveur | Service Account GCP pour signer les passes | Configuré dans `.env.local` / Vercel |
| `GOOGLE_WALLET_PRIVATE_KEY` | Serveur | Clé privée RSA du Service Account | Clé RSA 2048-bit configurée |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client (Public) | Clé restreinte Google Maps / Places | Configuré dans `.env.local` / Vercel |
| `GOOGLE_PLACES_API_KEY` | Serveur | Clé API Google Places | Configuré dans `.env.local` / Vercel |
| `GOOGLE_CLIENT_ID` | Serveur/Supabase | OAuth Client ID Google | Configuré dans `.env.local` & Supabase |
| `GOOGLE_CLIENT_SECRET` | Serveur/Supabase | OAuth Client Secret Google | Configuré dans `.env.local` & Supabase |

---

## 8. Résolution des Problèmes Courants (Troubleshooting)

### Erreur 1 : `redirect_uri_mismatch` (Code 400)
- **Cause** : L'URL de callback appelée par l'application ne correspond pas exactement à celles enregistrées dans les Identifiants OAuth GCP.
- **Solution** : Vérifiez que l'URI `https://<VOTRE-PROJET-REF>.supabase.co/auth/v1/callback` est bien saisie dans GCP sans espace ni slash supplémentaire à la fin.

### Erreur 2 : `Google Wallet API has not been used in project...` (Code 403)
- **Cause** : L'API Google Wallet n'est pas activée sur le projet GCP associé au Service Account, ou la propagation de l'activation prend quelques minutes.
- **Solution** : Vérifiez dans *API et services > API activées* que `Google Wallet API` figure bien dans la liste.

### Erreur 3 : `error:0909006C:PEM routines:get_name:no start line` ou signature RSA invalide
- **Cause** : Les sauts de ligne `\n` de la clé privée `GOOGLE_WALLET_PRIVATE_KEY` sont mal échappés lorsqu'ils sont collés dans Vercel ou dans le `.env.local`.
- **Solution** : Entourez la clé de guillemets doubles et remplacez les véritables sauts de ligne par le caractère littéral `\n`, ou utilisez `.replace(/\\n/g, '\n')` côté serveur (déjà pris en charge par `lib/wallet/`).

### Erreur 4 : `RequestDenied: The provided API key is invalid` (Google Maps)
- **Cause** : La clé Maps API n'est pas activée, ou les restrictions HTTP bloquent l'origine courante (ex. port local différent `localhost:3200`).
- **Solution** : Ajoutez l'origine exacte dans les restrictions de référents HTTP de la clé API.
