# Minerva Flow — Audit de l'Application Mobile iOS & Feuille de Route Marque Blanche

> **Document de Référence & Statut Opérationnel** — Version 1.0 (Septembre 2026).  
> Ce document fait l'état des lieux complet de l'application mobile native iOS (`native/ios`), de sa configuration de soumission TestFlight, et définit la feuille de route pour sa conversion en template marque blanche (white-label) avec commande pour livraison dynamique (type Uber Eats).

---

## 1. État des Lieux de l'Application Mobile Native iOS

### 1.1 Architecture & Stack Technique
* **Plateforme cible** : iOS 17.0+ (iPhone & iPad), 100% natif en **SwiftUI** & **Swift 5.9+**.
* **Génération de projet** : **XcodeGen** (`native/ios/project.yml`) garantissant des builds reproductibles, sans conflits Git sur le fichier `.xcodeproj`.
* **Backend & Données** : `supabase-swift` (v2.29.0) avec sécurité niveau ligne (RLS strict) et synchronisation temps réel.
* **Monitoring & Crash Reporting** : `sentry-cocoa` (v8.44.0).
* **Extensions natives** : Extension de Widget iOS (`MinervaFlowWidgetExtension`) pour l'affichage des points et du palier fidélité directement sur l'écran d'accueil de l'iPhone.
* **Sécurité & Biométrie** : `LocalAuthentication` (Face ID / Touch ID) pour le verrouillage du compte.
* **Conformité & Données personnelles** : Export de données en 1 tap (Loi 25 Québec / RGPD), gestion du consentement aux communications LCAP (CASL).

### 1.2 Les 4 Onglets Cœurs Construits en Profondeur

1. **Accueil (`HomeView.swift`)** :
   * Carte d'adhérent dynamique avec indicateur de palier (*Découverte*, *Habitué*, *Privilégié*, *Ambassadeur*).
   * Visualisation de la progression vers le palier supérieur avec les seuils réels du restaurant.
   * Accès rapide « Ma Carte » (code QR client pour le scan en caisse).
   * Découverte cartographique des restaurants partenaires (MapKit avec tri par proximité).
   * Fil d'offres promotionnelles actives et récompense la plus proche débloquable.

2. **Commander (`MenuView.swift` & `MenuItemDetailView.swift`)** :
   * Navigation par catégories de menu (Boissons, Plats, Desserts) avec icônes contextuelles.
   * Fiche détaillée par plat avec gestion des déclinaisons et options.
   * Panier complet avec calcul des taxes officielles (TPS 5% + TVQ 9,975% = 14,975%) et sélection du pourboire (sur le sous-total).
   * Envoi de la commande directement dans la file de production du restaurant (`orders`).

3. **Récompenses (`RewardsView.swift`)** :
   * Catalogue des récompenses échangeables contre des points.
   * Générateur de parrainage instantané : QR code large pleine largeur + lien de partage natif iOS (`UIActivityViewController`).
   * Liste des coupons et codes de récompenses en attente de validation en salle.

4. **Profil (`ProfileView.swift`)** :
   * Gestion du profil (nom, email, téléphone).
   * Historique chronologique complet des transactions de points.
   * Bascule Face ID / Touch ID.
   * Gestion du consentement marketing et suppression irréversible du compte (obligation App Store).

---

## 2. Statut de Soumission App Store & TestFlight

### 2.1 Archives de Build Existantes
* Plusieurs archives de distribution App Store ont été générées avec succès dans `build/archives/` :
  * `MinervaFlow-AppStore-final5.xcarchive`
  * `MinervaFlow-AppStore-final4.xcarchive`
  * `MinervaFlow-Distribution.xcarchive`
* **Bundle ID** : `com.minervaflow.loyalty`
* **Team ID Apple Developer** : `NHMPLN46TN`
* **Version marketing** : `1.0.0` (Build `1`)

### 2.2 Notifications Push & Clé APNs
* La clé d'authentification Apple Push Notification Service (APNs) est présente à la racine du dépôt :
  * Fichier : `AuthKey_VM6PL9H8X3.p8`
  * Key ID : `VM6PL9H8X3`
  * Le serveur d'envoi de notifications push (`NotificationManager.swift` / bridge serveur) est prêt à router les alertes d'offres et de récompenses dès l'activation sur le portail développeur.

### 2.3 Comment Tester l'Application Immédiatement

#### Option A — Test en Simulateur iOS (Recommandé en local)
Exécuter le script de build dédié depuis le dossier racine :
```bash
cd "native/ios"
./build-simulator.sh
```
Ou ouvrir `MinervaFlow.xcodeproj` dans Xcode, sélectionner une cible simulateur (ex: *iPhone 16 Pro*), et faire **Cmd + R**.

#### Option B — Installation directe sur un iPhone physique (Sideload)
1. Brancher votre iPhone au Mac par câble USB.
2. Ouvrir `MinervaFlow.xcodeproj` dans Xcode.
3. Sélectionner votre iPhone dans la liste des appareils cibles.
4. Si demandé, sélectionner votre compte Apple dans l'onglet **Signing & Capabilities** (Personal Team ou Developer Program).
5. Appuyer sur **Run** (Cmd + R) pour installer et lancer l'application directement sur l'appareil.

#### Option C — Téléversement TestFlight (App Store Connect)
1. Ouvrir l'archive existante dans Xcode :  
   `open build/archives/MinervaFlow-AppStore-final5.xcarchive`
2. Cliquer sur **Distribute App** → **TestFlight & App Store** → **Upload**.
3. Une fois téléversée, l'app apparaît dans [App Store Connect](https://appstoreconnect.apple.com/) sous la section **TestFlight**.
4. Les testeurs internes reçoivent immédiatement l'invitation par email pour installer l'application via l'app officielle TestFlight.

---

## 3. Stratégie de Transformation en Template Marque Blanche (White-Label)

Pour permettre à n'importe quel restaurateur ou franchise de déployer sa propre application personnalisée sans modifier le code source :

```
┌──────────────────────────────────────────────────────────┐
│                 Modèle Marque Blanche                     │
├──────────────────────────────────────────────────────────┤
│ 1. Identité Visuelle :                                   │
│    • Nom de l'application & Display Name                 │
│    • Icône d'application (`AppIcon.appiconset`)         │
│    • Couleurs de marque : Accent, Surface, Fond          │
│    • Logo vectoriel / Favicon                            │
│                                                          │
│ 2. Configuration Backend :                               │
│    • `restaurant_id` et `workspace_id` par défaut        │
│    • Domaine d'API Supabase personnalisé                 │
│    • Clé Stripe Connect spécifique au restaurant         │
│                                                          │
│ 3. Automatisation XcodeGen (`project.yml`) :             │
│    • Script CLI `scripts/generate-whitelabel.sh`         │
│    • Injection des paramètres dans `Config.swift`        │
│    • Génération automatique des certificats de build     │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Spécifications du Module de Commande en Livraison Dynamique (Type Uber)

### 4.1 Objectifs
Permettre au client final de passer une commande en livraison directement depuis l'application ou le portail web, avec :
1. Calcul des frais de livraison en fonction de l'adresse de destination (distance routière et durée estimée).
2. Validation du rayon de livraison maximal configuré par le restaurateur.
3. Paiement direct sur le compte Stripe Connect du restaurant.
4. Notification temps réel sur la caisse / tablette cuisine.

### 4.2 Formule de Tarification Dynamique
$$\text{Frais de livraison} = \text{Frais de base} + \left(\max(0, \text{Distance (km)} - \text{Distance franchise}) \times \text{Tarif / km}\right) + \text{Majoration pointe}$$

* **Exemple de configuration standard** :
  * Frais de base (jusqu'à 2 km) : `3,99 $`
  * Tarif au kilomètre additionnel : `1,25 $ / km`
  * Rayon maximal autorisé : `10 km`
  * Majoration météo ou forte affluence (rush) : `+1,50 $` (activable depuis le dashboard)

### 4.3 Intégration Technique Prévue (Phase 2)
* **Calcul de distance** : API MapKit Directions (côté iOS) et OpenStreetMap / Google Routes (côté serveur).
* **Paiement** : Stripe PaymentIntents avec transfert direct au compte connecté (`destination: restaurant.stripe_account_id`), 0% de commission Minerva.
* **Suivi de commande** : États d'avancement synchronisés en temps réel (`en attente`, `en préparation`, `en cours de livraison`, `livrée`).
