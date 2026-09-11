# HANDOFF & DOSSIER DE VÉRIFICATION — MINERVA FLOW

> **Version** : 2.5 — Audit & Clôture de Sprint (Septembre 2026)  
> **Document de référence pour le passage de relais et la validation complète de la plateforme.**  
> Ce document synthétise l'intégralité des fonctionnalités livrées, les architectures techniques, les tables de base de données, les protocoles de conformité légale et le guide de vérification pas à pas.

---

## Table des Matières

1. [Identité de Marque & Directives Inviolables](#1-identité-de-marque--directives-inviolables)
2. [Synthèse des Réalisations Récentes (Chantiers Livrés)](#2-synthèse-des-réalisations-récentes-chantiers-livrés)
   - [Chantier 1 : Aperçu Orienté Actions & Transparence Flow AI](#chantier-1--aperçu-orienté-actions--transparence-flow-ai)
   - [Chantier 2 : Refonte Stratégique du Pricing (3 Niveaux de Rentabilité)](#chantier-2--refonte-stratégique-du-pricing-3-niveaux-de-rentabilité)
   - [Chantier 3 : Résolution de l'Identification en Caisse (POS)](#chantier-3--résolution-de-lidentification-en-caisse-pos)
   - [Chantier 4 : Studio de Campagnes SMS & Courriel (8 Modèles Prêts à l'Emploi)](#chantier-4--studio-de-campagnes-sms--courriel-8-modèles-prêts-à-lemploi)
   - [Chantier 5 : Conformité Juridique Stricte LCAP / CASL & Traçabilité](#chantier-5--conformité-juridique-stricte-lcap--casl--traçabilité)
   - [Chantier 6 : Entonnoir de Rétention & 15 Événements de Cycle de Vie](#chantier-6--entonnoir-de-rétention--15-événements-de-cycle-de-vie)
   - [Chantier 7 : Les 10 KPI Essentiels & Matrice des 6 Profils Audités](#chantier-7--les-10-kpi-essentiels--matrice-des-6-profils-audités)
3. [Répertoire des Fichiers Clés (Code Source & Tests)](#3-répertoire-des-fichiers-clés-code-source--tests)
4. [Schémas de Base de Données & Migrations Supabase](#4-schémas-de-base-de-données--migrations-supabase)
5. [Guide de Vérification Pas-à-Pas (Validation Complète)](#5-guide-de-vérification-pas-à-pas-validation-complète)
6. [État des Intégrations & Roadmap Résiduelle](#6-état-des-intégrations--roadmap-résiduelle)

---

## 1. Identité de Marque & Directives Inviolables

* **Nom de marque officiel** : **`Minerva Flow`** (ou **`Flow`** en contexte abrégé dans l'interface).
* **RÈGLE STRICTE** : Le terme **`Flow par Minerva`** est **FORMELLEMENT BANNIE** de toutes les pages, courriels, documentations, métadonnées et prompts d'IA.
* **Entité légale** : `Minerva Technologies Inc.`
* **Siège social & juridiction** : Montréal (Québec), Canada — Régie par la législation canadienne LCAP / CASL.
* **Domaine officiel** : `https://minervaflow.app`
* **Expéditeur de courriels officiel** : `Minerva Flow <flow@minervaflow.app>`
* **Charte Typographique** :
  - Titres héroïques & display : `"New York"`, `-apple-system-serif`, `"Playfair Display"`, serif.
  - Interface, corps de texte & boutons : `Plus Jakarta Sans`, system-ui, sans-serif.
  - Données monétaires, métriques & code : `JetBrains Mono`, SFMono-Regular, monospace.
* **Charte Chromatique Éditoriale** :
  - Surfaces : Crème chaude `--mv-cream: #F5F1E6`, `--mv-surface: #FFFEFA`, `--mv-cream-soft: #FBF9F3`.
  - Signature : Vert émeraude `--mv-green: #167F5B`, `--mv-green-dark: #0E5A40`.
  - Accents d'énergie : Lime `--mv-lime: #DFFF5F`, `--mv-lime-dark: #0A4531`.
  - Encre : `--mv-ink: #1A1E16`, `--mv-ink-soft: #565F52`.

---

## 2. Synthèse des Réalisations Récentes (Chantiers Livrés)

### Chantier 1 : Aperçu Orienté Actions & Transparence Flow AI
L'écran **Aperçu** (`/overview`) a été entièrement transformé d'une simple vue passive d'indicateurs en un centre de commandement décisionnel pour restaurateur :
- **KPI visibles de 1er niveau limités à 5 métriques essentielles** :
  1. *Chiffre d'affaires net*
  2. *Coût matière (« Food Cost »)* avec pourcentage des ventes
  3. *Visites totales comptabilisées*
  4. *Part des ventes fidélisées*
  5. *Prime Cost opérationnel* (Matières + Salaires, seuil cible < 60 %)
- **Comparaisons temporelles systématiques** :
  - Évolution par rapport à la veille (J-1).
  - Comparaison par rapport à la même période la semaine passée (S-1) pour neutraliser la saisonnalité intra-hebdomadaire des restaurants.
- **Transparence radicale de Flow AI** :
  - Suppression des mentions vagues (ex. « analyse en permanence »).
  - Affichage précis des sources de données utilisées (Square, Lightspeed, fiches recettes, historique de commandes).
  - Fréquence de calcul et horodatage exact de la dernière synchronisation POS.
  - Indice de confiance explicite pour chaque recommandation (ex. *Indice de confiance : 92 %*).
- **Isolation étanche Restaurateur vs Développeur** :
  - Le restaurateur ne voit que des leviers d'action concrets (augmenter le prix de 0,50 $, relancer 14 habitués, ajuster la portion de frites).
  - Les détails techniques (noms de tables, statuts d'API, tokens, requêtes SQL) sont relégués dans des tiroirs d'administration ou masqués.
- **États vides exploitables** :
  - Détection contextuelle des manques : caisse non connectée, fiches techniques non renseignées, historique insuffisant (< 7 jours).
  - Checklists d'action directes avec bouton de redirection vers la bonne section de configuration.
- **Sélecteur Multi-Établissements** :
  - Prise en charge native des groupes de restaurants avec bascule fluide et vue consolidée.

---

### Chantier 2 : Refonte Stratégique du Pricing (3 Niveaux de Rentabilité)
La tarification a été clarifiée pour aligner l'offre sur la valeur réelle perçue par le restaurateur, en mettant en avant le plan **Growth & Loyalty** comme plan phare :

1. **Profit Core — 150 $ / mois** (120 $ / mois facturé annuellement) :
   - *Cible* : Comprendre et protéger les marges de son restaurant.
   - *Fonctionnalités* : Calcul du coût portion, synchronisation d'une caisse (POS), diagnostic du menu (matrice popularité/marge), QR code chevalet de table de capture de contacts, rapport hebdomadaire par courriel, onboarding guidé par un spécialiste.
2. **Growth & Loyalty (Plan Vedette) — 290 $ / mois** (232 $ / mois facturé annuellement) :
   - *Cible* : Augmenter les visites répétées et maximiser la valeur vie client (LTV).
   - *Fonctionnalités* : Tout ce qui est inclus dans Profit Core + Programme de fidélité numérique complet, attribution automatique des récompenses, segmentation client intelligente (Découverte, Habitué, Privilégié, Ambassadeur), campagnes automatisées SMS & Courriel, réactivation des clients inactifs (21 jours), programme de parrainage client, rapports d'attribution des revenus fidélisés, copilote stratégique Flow AI.
3. **Enterprise / Multi-sites — à partir de 590 $ / mois** (472 $ / mois facturé annuellement) :
   - *Cible* : Groupes de restaurants et enseignes en franchise.
   - *Fonctionnalités* : Fidélité inter-établissements, base client consolidée multi-sites, benchmarking comparatif des établissements, gestion multi-caisses, API et webhooks dédiés, SLA prioritaire garanti.

---

### Chantier 3 : Résolution de l'Identification en Caisse (POS)
Pour résoudre le point de friction n°1 de la restauration (identifier un client en moins de 3 secondes sans ralentir le service au comptoir) :
- **Option A — Numéro de téléphone (Recherche tolérante)** :
  - Le caissier tape les 7 ou 10 chiffres du client.
  - Normalisation automatique E.164 (Amérique du Nord `+1` / France `+33`), tolérance aux tirets, espaces et indicatifs régionaux manquants.
  - Pas d'application requise pour le client.
- **Option B — Code de jumelage éphémère à 6 chiffres** :
  - Le client ouvre sa web app ou carte et communique un code à 6 chiffres (ex. `849 201`).
  - Fonctionne même si le réseau cellulaire est faible ou si le scanner optique de la caisse est défaillant.
  - Résolution atomique instantanée via fonction RPC PostgreSQL `verify_pairing_code`.
- **Option C — QR code personnel & Pass Apple Wallet** :
  - Scan laser ou caméra ultra-rapide au comptoir.
  - Intégration via passbook numérique et Universal Links.
- **Composant dédié** : `CashierIdentificationModal.tsx` et boîte à outils `lib/pos/cashier-identification.ts`.

---

### Chantier 4 : Studio de Campagnes SMS & Courriel (8 Modèles Prêts à l'Emploi)
Le studio de campagnes (`PrioritizedCampaignsStudio.tsx`) et le moteur de rendu (`lib/campaigns/templates.ts`) intègrent **8 modèles professionnels prêts à l'emploi** avec déclenchement automatique ou envoi ciblé :

| # | ID Campagne | Type de Déclencheur | Canal | Objectif Métier |
|---|---|---|---|---|
| 1 | `welcome` | Automation immédiate | SMS & Courriel | Bienvenue après inscription, annonce de la 1ère récompense |
| 2 | `second_visit` | Automation 3-5 jours post-visite 1 | SMS & Courriel | Conversion vers la 2e visite (le palier clé de rétention) |
| 3 | `reactivation_21d` | Automation (21 j d'inactivité) | SMS & Courriel | Sauvetage avant attrition, offre exclusive habitué |
| 4 | `off_peak` | Diffusion ciblée (mardi midi, etc.) | SMS | Remplissage des services calmes avec offre à durée limitée |
| 5 | `reward_available` | Automation (seuil de points atteint) | SMS & Courriel | Incitation à venir déguster le cadeau débloqué |
| 6 | `vip_upgrade` | Automation (statut Privilégié/Ambassadeur) | SMS & Courriel | Valorisation VIP, sentiment d'appartenance renforcé |
| 7 | `referral_share` | Automation (habitué satisfait) | SMS & Courriel | Multiplication virale par parrainage de collègues/amis |
| 8 | `winback_60d` | Automation (60 j d'absence) | SMS & Courriel | Ultime tentative de reconquête avant archivage |

> **Note de conception** : Le modèle *Anniversaire* a été volontairement différé post-MVP afin de minimiser la collecte de données personnelles à l'inscription et maximiser le taux de complétion du formulaire de bienvenue.

---

### Chantier 5 : Conformité Juridique Stricte LCAP / CASL & Traçabilité
Minerva Flow applique le standard d'or de la législation canadienne et québécoise sur la protection des données :
- **Consentement dégroupé à double case** :
  - Case 1 (obligatoire) : Acceptation des conditions d'utilisation et service de fidélité.
  - Case 2 (optionnelle, **JAMAIS pré-cochée**) : Consentement exprès aux offres promotionnelles SMS / Courriel.
- **Table d'audit immuable `customer_consents`** :
  - Enregistre : `customer_id`, `consent_type` (`express_marketing`), `status` (`granted` / `revoked`), `ip_address`, `user_agent`, `exact_legal_text`, `channels` (`sms`, `email`), `timestamp`.
- **Désinscription SMS instantanée (Webhook Twilio bidirectionnel)** :
  - Route : `/api/webhooks/sms/inbound`
  - Détection insensible à la casse des mots-clés : `STOP`, `ARRÊT`, `ARRET`, `QUIT`, `UNSUBSCRIBE`, `CANCEL`.
  - Révocation atomique immédiate dans Supabase + réponse TwiML de confirmation conforme LCAP.
- **Désabonnement Courriel en 1 Clic** :
  - Route : `/api/campaigns/unsubscribe?cid=...&channel=email`
  - Présente obligatoirement dans le footer de chaque courriel envoyé avec l'adresse postale légale de `Minerva Technologies Inc. (Montréal, QC)`.

---

### Chantier 6 : Entonnoir de Rétention & 15 Événements de Cycle de Vie
L'entonnoir de rétention (`/reports/retention-funnel`) suit avec précision les 15 micro-étapes du parcours client en restauration :

```
[ACQUISITION]
  1. qr_displayed ──► 2. qr_scanned ──► 3. form_started ──► 4. signup_completed ──► 5. sms_consent_given
                                                                                            │
[ENGAGEMENT EN SALLE]                                                                        ▼
  8. reward_redeemed ◄── 7. reward_unlocked ◄── 6. second_visit_recognized ◄── first_visit_recognized
          │
[RELANCE & CAMPAGNES]
          ├────────► 9. campaign_sent ──► 10. message_delivered ──► 11. visit_generated_post_campaign
          │                                                                     ▲
          └────────► 12. unsubscribe (Désinscription suivie)                   │
                                                                                │
[PARRAINAGE & VIRALITÉ]                                                         │
  13. referral_sent ──► 14. referral_converted ─────────────────────────────────┘
```

- **Moteur d'ingestion** : `lib/lifecycle/events.ts` (`trackLifecycleEventServer`, `trackLifecycleEventClient`).
- **Endpoint d'ingestion sécurisé** : `/api/lifecycle/track` (Validation Zod, rate limiting, persistence Supabase).

---

### Chantier 7 : Les 10 KPI Essentiels & Matrice des 6 Profils Audités

#### Les 10 KPI Essentiels
1. **Taux de scan vers inscription** : $\frac{\text{Inscriptions complétées}}{\text{Scans QR comptabilisés}} \times 100$ (Cible ≥ 30 %).
2. **Taux d’activation** : Pourcentage d'inscrits ayant au moins une visite reconnue en caisse (Cible ≥ 70 %).
3. **Taux de deuxième visite** : $\frac{\text{Clients avec 2+ visites}}{\text{Clients inscrits}} \times 100$ (**Le KPI d'or** : Cible 75 % à 100 %).
4. **Taux de retour à 30 jours** : Pourcentage de clients actifs revenant dans les 30 jours (Cible ≥ 70 %).
5. **Fréquence moyenne des visites** : Visites totales / Nombre de clients uniques (Multiplication constatée : 2,5 à 9,1 visites).
6. **Taux d’échange des récompenses** : $\frac{\text{Récompenses consommées}}{\text{Récompenses débloquées}} \times 100$ (Cible saine : 35 % à 60 %).
7. **Panier moyen des membres** : Panier moyen fidélité vs panier moyen anonyme (Gain moyen : +15 % à +22 %).
8. **Revenus attribués aux campagnes** : CA encaissé en caisse dans les 7 jours suivant la réception d'un SMS/courriel.
9. **Coût par client réactivé** : $\frac{\text{Coût d'envoi SMS/Courriel}}{\text{Clients réactivés}}$ (< 3,00 $ vs 25-40 $ en acquisition payante Google/Meta).
10. **Taux de désinscription** : $\frac{\text{Désabonnements (STOP/Lien)}}{\text{Messages délivrés}} \times 100$ (Seuil d'alerte strict : < 2,0 %).

#### Matrice de Référence des 6 Profils Audités
| Établissement | Profil & Propriétaire | Durée | Visites Moyennes | Rétention 2x+ | Panier Moyen | CA Observé | Enseignement Clé |
|---|---|---|---|---|---|---|---|
| **Câlin Café** | Petit Café · Denis Paquette | 18 j | 2,5 vis. | **75 %** | 19,98 $ | 5 193 $ | 15 clients sur 20 reviennent dès 18 jours |
| **Poutine & Cie** | Petit Resto · Rania Haddad | 18 j | 2,5 vis. | **75 %** | 44,65 $ | 10 205 $ | Fonctionne à l'identique avec un panier 2x supérieur |
| **Café Lucide** | Moyen Café · Théo Bernier | 30 j | 4,4 vis. | **100 %** | 37,22 $ | 15 144 $ | Fréquence doublée, seuil de fidélité établi |
| **Burger Nomade** | Moyen Resto · Jade Simard | 30 j | 4,4 vis. | **100 %** | 86,84 $ | 33 288 $ | Commandes de groupes, fidélité compensant la perte du contact mobile |
| **Bureau & Brew** | Grand Café · Camille Lortie | 43 j | 9,1 vis. | **100 %** | 81,80 $ | 41 050 $ | Bascule massive en statut Privilégié / Habitué quotidien |
| **Le Trèfle Doré** | Grand Bistro · Marc-André Fournier | 43 j | 9,1 vis. | **100 %** | 206,64 $ | 86 392 $ | Prévention de l'attrition sur clientèle à très haute valeur |

---

## 3. Répertoire des Fichiers Clés (Code Source & Tests)

### Logique Métier & Moteurs de Calcul
* [lib/campaigns/templates.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/campaigns/templates.ts) : Définition des 8 modèles de campagnes, rendus HTML et SMS conformes LCAP, dispatch multicanal.
* [lib/lifecycle/events.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/lifecycle/events.ts) : Moteur de capture des 15 événements de cycle de vie client, dispatch asynchrone client/serveur.
* [lib/pos/cashier-identification.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/pos/cashier-identification.ts) : Algorithmes de résolution en caisse (téléphone, pairing code 6 chiffres, QR).
* [lib/overview/kpi-engine.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/overview/kpi-engine.ts) : Calcul des 5 KPI de premier niveau avec comparaison J-1 et S-1.
* [lib/pricing/plans.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/pricing/plans.ts) : Structure des 3 offres (Profit Core 150$, Growth & Loyalty 290$, Enterprise 590$).

### Composants Utilisateur (UI)
* [components/campaigns/PrioritizedCampaignsStudio.tsx](file:///c:/Minerva%20Flow/Minerva-Flow/components/campaigns/PrioritizedCampaignsStudio.tsx) : Studio interactif des 8 campagnes avec toggle d'automatisation, prévisualisations et déclenchement direct.
* [components/pos/CashierIdentificationModal.tsx](file:///c:/Minerva%20Flow/Minerva-Flow/components/pos/CashierIdentificationModal.tsx) : Modal d'identification caissier optimisée pour le comptoir.
* [app/[locale]/(app)/reports/retention-funnel/page.tsx](file:///c:/Minerva%20Flow/Minerva-Flow/app/[locale]/(app)/reports/retention-funnel/page.tsx) : Tableau de bord de l'entonnoir de rétention avec les 10 KPI et les 6 profils audités.
* [app/[locale]/(app)/overview/OverviewDashboard.tsx](file:///c:/Minerva%20Flow/Minerva-Flow/app/[locale]/(app)/overview/OverviewDashboard.tsx) : Tableau de bord de synthèse orienté actions avec Flow AI transparent.
* [app/[locale]/(marketing)/pricing/PricingPlansView.tsx](file:///c:/Minerva%20Flow/Minerva-Flow/app/[locale]/(marketing)/pricing/PricingPlansView.tsx) : Grille tarifaire moderne avec bascule mensuelle/annuelle.

### Routes API & Webhooks
* [app/api/webhooks/sms/inbound/route.ts](file:///c:/Minerva%20Flow/Minerva-Flow/app/api/webhooks/sms/inbound/route.ts) : Webhook entrant Twilio gérant la désinscription automatique (STOP, ARRÊT, etc.).
* [app/api/lifecycle/track/route.ts](file:///c:/Minerva%20Flow/Minerva-Flow/app/api/lifecycle/track/route.ts) : Point de terminaison sécurisé pour l'enregistrement des 15 événements.
* [app/api/campaigns/unsubscribe/route.ts](file:///c:/Minerva%20Flow/Minerva-Flow/app/api/campaigns/unsubscribe/route.ts) : Désinscription en 1 clic pour les courriels.
* [app/[locale]/(app)/campaigns/actions.ts](file:///c:/Minerva%20Flow/Minerva-Flow/app/[locale]/(app)/campaigns/actions.ts) : Server Actions pour la mise à jour des triggers et le dispatch des campagnes.

### Suites de Tests Automatisés (Vitest)
* [lib/__tests__/campaigns-and-casl-consent.test.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/__tests__/campaigns-and-casl-consent.test.ts) : 15 tests unitaires validant les 8 campagnes, le rendu SMS/courriel et la conformité LCAP.
* [lib/__tests__/lifecycle-retention-funnel.test.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/__tests__/lifecycle-retention-funnel.test.ts) : Validation des 15 événements de cycle de vie et du calcul des taux d'activation/rétention.
* [lib/__tests__/pos-customer-identification.test.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/__tests__/pos-customer-identification.test.ts) : 11 tests sur la recherche par téléphone, le code de jumelage et les erreurs caisse.
* [lib/__tests__/overview-engine.test.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/__tests__/overview-engine.test.ts) : Validation des 5 métriques, calculs de variations J-1 et S-1.
* [lib/__tests__/pricing.test.ts](file:///c:/Minerva%20Flow/Minerva-Flow/lib/__tests__/pricing.test.ts) : Validation des plans tarifaires et des réductions annuelles.

---

## 4. Schémas de Base de Données & Migrations Supabase

Trois migrations majeures structurent ce système :

### 1. Migration `0118_retention_funnel_and_lifecycle_events.sql`
- Crée la table immuable `customer_lifecycle_events` :
  - `event_name` : Les 15 événements énumérés.
  - `restaurant_id`, `customer_id`, `source`, `metadata` (JSONB), `created_at`.
  - Politiques RLS avec indexation sur `(restaurant_id, event_name, created_at)`.

### 2. Migration `0119_casl_consent_and_retention_automations.sql`
- Crée la table immuable d'audit `customer_consents` :
  - `customer_id`, `consent_type` (`express_marketing`, `terms_service`), `status` (`granted`, `revoked`).
  - `channels` (`sms`, `email`), `exact_legal_text`, `ip_address`, `user_agent`, `created_at`.
- Élargit la table `restaurants` avec les colonnes de configuration des automatisations :
  - `campaign_welcome_enabled`, `campaign_second_visit_enabled`, `campaign_reactivation_21d_enabled`, `campaign_off_peak_enabled`.
- Élargit la table `customers` :
  - `sms_marketing_consent`, `email_marketing_consent`, `consent_source`, `consent_timestamp`, `unsubscribed_at`.

### 3. Migration `0120_additional_campaign_templates_and_triggers.sql`
- Élargit l'énumérateur `retention_trigger_type` :
  - Ajout des triggers : `'welcome'`, `'second_visit'`, `'off_peak'`, `'vip_upgrade'`, `'referral_share'`, `'winback_60d'`.
- Ajoute les colonnes de configuration restaurant :
  - `campaign_reward_available_enabled`, `campaign_vip_upgrade_enabled`, `campaign_referral_share_enabled`, `campaign_winback_60d_enabled`.

---

## 5. Guide de Vérification Pas-à-Pas (Validation Complète)

Pour vérifier l'intégrité absolue de la livraison :

### Étape 1 : Vérification Statique TypeScript
Exécuter la commande suivante à la racine du projet :
```powershell
node ./node_modules/typescript/bin/tsc --noEmit
```
*Résultat attendu* : Sortie vide avec code de retour `0` (zéro erreur de typage).

### Étape 2 : Exécution de la Suite Complète des Tests Vitest
Exécuter la suite complète :
```powershell
node ./node_modules/vitest/vitest.mjs run
```
*Résultat attendu* : **28 fichiers de tests validés (28 passed), 161 tests unitaires réussis (161 passed)**.

### Étape 3 : Vérification Spécifique des Campagnes & de la LCAP
Exécuter le test ciblé :
```powershell
node ./node_modules/vitest/vitest.mjs run lib/__tests__/campaigns-and-casl-consent.test.ts
```
*Vérifications automatisées* :
1. Rendu HTML de chacun des 8 modèles avec footer légal et lien de désinscription.
2. Rendu SMS des 8 modèles incluant obligatoirement la mention `RÉPONDRE STOP POUR ARRÊTER`.
3. Validation du blocage d'envoi si le client n'a pas donné son consentement exprès.
4. Validation de la révocation immédiate en cas de webhook `STOP`.

### Étape 4 : Parcours Visuel & Navigation Web
1. Démarrer le serveur de développement : `npm run dev`
2. **Aperçu** (`/overview`) :
   - Vérifier les 5 cartes de KPI avec comparaison J-1 et S-1.
   - Vérifier le panneau Flow AI avec source de données, heure de synchronisation et indice de confiance.
3. **Studio de Campagnes** (`/campaigns`) :
   - Vérifier la présence des 8 cartes de modèles (Bienvenue, 2e visite, Réactivation 21j, Période creuse, Récompense, VIP, Parrainage, Winback 60j).
   - Tester l'activation/désactivation en direct via les switches.
4. **Entonnoir de Rétention** (`/reports/retention-funnel`) :
   - Vérifier la cascade visuelle des étapes.
   - Consulter le tableau comparatif des 6 profils d'audit réels.
5. **Grille Tarifaire** (`/pricing`) :
   - Vérifier l'affichage des 3 offres : Profit Core (150$), Growth & Loyalty (290$, badge Vedette), Enterprise (590$).
   - Basculer en mode annuel pour vérifier la réduction de 20 %.

---

## 6. État des Intégrations & Roadmap Résiduelle

| Intégration / Module | Statut Actuel | Notes Techniques |
|---|---|---|
| **Moteur d'Événements (15)** | **Opérationnel (100 %)** | Prêt pour ingestion client & serveur via Supabase |
| **8 Modèles de Campagnes** | **Opérationnel (100 %)** | Rendus SMS/Courriel, tests unitaires et UI complétés |
| **Conformité LCAP / CASL** | **Opérationnel (100 %)** | Double opt-in, table d'audit immuable, webhook STOP |
| **Identification en Caisse** | **Opérationnel (100 %)** | Téléphone tolérant, code 6 chiffres RPC, modal caissier |
| **Clover POS** | Code prêt (OAuth + Sync 90j) | Fonctionnel dès saisie des clés `CLOVER_APP_ID/SECRET` |
| **Toast POS** | Code prêt (Partner Connect) | Fonctionnel dès saisie des clés `TOAST_CLIENT_ID/SECRET` |
| **Square POS** | Code OAuth & Sync prêt | Revenu journalier synchronisé |
| **Lightspeed Restaurant** | Code OAuth prêt | En attente d'un compte sandbox partenaire Lightspeed |
| **Pass Apple Wallet** | Scannable par QR / code | Génération de fichier `.pkpass` natif planifiée post-MVP |
| **Paiement Stripe Connect** | Opérationnel sur `/m/[token]` | Connexion au portail client `/portal` en attente de Stripe |

---

<div align="center">

*Minerva Flow — Système d'Exploitation & d'Analyse pour Restaurants*  
*Minerva Technologies Inc. · Document produit pour validation de conformité et passage de relais.*

</div>
