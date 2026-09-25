# HANDOFF & DOSSIER DE VÉRIFICATION — MINERVA FLOW

> **Base historique** : 2.36.0 — clôture de sprint du 15 septembre 2026.
> **État produit actualisé** : 25 septembre 2026. Les sections historiques plus bas décrivent leur date de session et ne remplacent pas le [guide produit propriétaire et client](docs/PRODUCT_GUIDE_OWNER_CLIENT.md), ni les rapports de vérification les plus récents.

## Vérification de reprise — 2026-09-25

### Reprise des blocages — état confirmé après changement concurrent

- L’écran `/en/login` a été corrigé : toutes les chaînes Auth et le panneau de présentation utilisent maintenant les messages anglais; `/fr/login` conserve les messages français. Playwright/Chromium cache 1.63 a vérifié les deux tailles (1440×900 et 390×844), sans erreur JavaScript ni débordement. Captures : `docs/screenshots/auth-login-en-2026-09-25-desktop.png` et `...-mobile.png`.
- La suite Vitest complète passe à nouveau : 335/335 tests, 58 fichiers; `npx tsc --noEmit` et ESLint ciblé passent. Deux assertions préexistantes ont été adaptées à `price_option_id: null` pour les lignes sans option tarifaire.
- POS/Connect ciblés : 40/40 tests unitaires passent. Ils couvrent les adaptateurs/mappings, mais pas une transaction POS réelle. Le staging n’a aucune connexion Connect Stripe enregistrée; `.env.test.local` ne contient pas de secrets sandbox Square/Clover/Toast, donc le paiement Connect et les E2E POS réels restent impossibles à confirmer. Les secrets fournisseur de `.env.local` n’ont pas été utilisés.
- Schéma contrôlé en lecture seule : production a maintenant `menu_items.price_options` (migration 0151, journal noté `20260925184354`), mais les quatre colonnes 0150 sont toujours absentes. Sur le staging autorisé, les colonnes 0150 existent, tandis que `menu_items.price_options` est encore absente. Aucun SQL ni paiement n’a été exécuté dans cette reprise.
- La production n’a pas été promue. Reste : valider 0150 en production de manière contrôlée, faire compléter l’onboarding du destinataire Stripe test jusqu’aux capacités actives, obtenir les identifiants sandbox POS et rétablir le runner E2E staging.

### Prochaines sorties demandées

- [x] Web : code candidat poussé au commit `1a63de8`; Preview exact `dpl_Hg2V8PaycRn86dVFCJWCfJbMtkqF` `READY` et journal de build aligné sur ce SHA. La correction `/en/login` est maintenant vérifiée sur ce Preview. Production reste sur `dpl_A35dLpmKawVPfxhp9rWEWSiVcRLc` (`f969e15`).
- [x] Chromium : cause trouvée — les dépendances attendent des builds Playwright différents de ceux installés dans le cache. Chromium headless existant, version Playwright 1.63, fonctionne avec un override temporaire. Le navigateur n’a pas été téléchargé ni la configuration permanente du projet modifiée.
- [ ] E2E staging : 3 parcours retentés dans une worktree propre avec données synthétiques et staging `lhosxxtvgmedwarwgjhb`; 0/3 réussis. Les parcours n’atteignent pas l’état attendu : navigation `/workspace`/`/login` expire et le worker Chromium n’arrive pas à démarrer dans le délai. Traces Playwright ignorées localement sous `test-results/`; reprendre après réparation du serveur de test/runtime.
- [ ] iOS : préparer le nouveau binaire natif (le projet est encore en `1.0.0` / build `11`, prochain numéro proposé `12`), relancer XCTest sur un runner stable, exécuter le hook App Store compliance, vérifier archive/dSYM, puis téléverser sur TestFlight et confirmer le groupe externe/lien.
- [ ] Après validation des deux sorties : publier les notes/changelog et décider de l’envoi du courriel aux utilisateurs consentants; aucune release ni notification n’est encore émise.

- **Diagnostic build — 2026-09-25** : `npx tsc --noEmit`, ESLint ciblé sur `next.config.ts` et `git diff --check` passent. `npx next build --webpack --debug` a pris 71 s pour compiler, 13 s pour TypeScript, a généré les 328 routes et s’est terminé avec le code 0; Next a signalé l’usage dynamique de `cookies` sur des routes privées, qui sont rendues dynamiquement. Aucun téléversement Sentry n’a été tenté localement. L’étape précédemment décrite comme bloquée était surtout une longue compilation silencieuse.

- **Mise à jour Sentry Vercel** : les variables Sentry obsolètes ont été retirées; `NEXT_PUBLIC_MINERVA_SENTRY_DSN` est configurée pour les trois environnements. La build Preview a confirmé le téléversement des source maps et la création de la release `20197a4c85f3aed215c6cd12ce69004b9ab70a4b` dans `minerva-s5m/minerva-flow-web`. Le jeton transmis dans le chat doit être tourné après validation. La ressource Marketplace existe toujours sans projet lié.

- **Candidate web `2.48.0`** : commit `1a63de8` inclut les formats tarifés (`6621c38`), le changelog illustré (`ef4c04c`) et la correction des traductions Auth. Preview exact `dpl_Hg2V8PaycRn86dVFCJWCfJbMtkqF`, `READY`, confirmé par journal de build pour ce SHA. Smoke Auth et images du changelog 200; `/en/login` anglais vérifié avec Chromium desktop/mobile, sans overflow ni erreur JavaScript. Production actuelle : `dpl_A35dLpmKawVPfxhp9rWEWSiVcRLc`, branche `main`, commit `f969e15`.
- Vérification fonctionnelle staging : 335 tests unitaires (58 fichiers), lint ciblé; `tsc --noEmit` est actuellement bloqué par un fichier de types Next généré tronqué sous `.next/dev/types/validator.ts`. Les E2E précédents (6/6), la reprise précommande/traiteur (2/2) et l’E2E Intégrations owner (1/1) passent avec le garde de rôle final. Une première reprise a échoué avant authentification; la suivante a réussi en 41,5 s. Vérification Supabase après nettoyage : le restaurant fixture et l’utilisateur synthétique sont absents.
- Reprise ciblée Playwright après configuration du bac à sable Stripe : 2/2 scénarios précommande/production traiteur réussis. Nouveau flux Accounts v2 Recipient implémenté pour les restaurants; les comptes Express v1 historiques restent inchangés. Migration additive 0150 appliquée au staging via DDL ciblé et ses quatre colonnes vérifiées. Smoke test API test-mode (création V2, lien hébergé, lecture d’état) réussi et compte synthétique fermé. Aucun destinataire test n’est encore activé : Checkout/PaymentIntent complet demeure non validé, le test antérieur ayant échoué avec `insufficient_capabilities_for_transfer`. Le navigateur E2E reste limité à une clé publiable `pk_test_` dédiée ou aucune clé.
- Inspection visuelle du reçu de précommande à 390 px : modale lisible, action de fermeture visible, aucun débordement horizontal. Captures conservées dans `docs/screenshots/`.
- La compilation iOS Simulator est réussie; XCTest actuel ne fournit aucun résultat confirmé, le runner Xcode se bloque. Le build TestFlight actif `1.0 (11)` ne contient pas la source `2.48.0`; aucun nouveau build iOS téléversé.
- Audit App Store actuel : 0 critique, 0 élevé, 2 avertissements (clé de chiffrement à confirmer côté widget; contrôles manuels métadonnées/confidentialité/review encore ouverts).
- **Production : NOT READY — aucune promotion, tag, release GitHub ni courriel utilisateur.** Les quatre champs de migration 0150 restent absents. La migration 0151 `menu_item_price_options` est appliquée (version `20260925184354`); `menu_items.price_options` est lisible. L’historique distant diverge du dépôt; ne pas lancer `supabase db push`. Les 21 brouillons Mains Magique restent inactifs; Magie Djonjon et Magie Don Pollo ont leurs choix 3/6/9 et leurs prix configurés, en attente de validation propriétaire. Le paiement Stripe Connect reste non validé; POS E2E incomplet et le dernier staging E2E échoue avant assertion métier.
- **Changelog in-app** : notes « Précommandes et devis traiteur » ajoutées au fallback in-app avec captures desktop/mobile dans `public/assets/changelog/`; elles sont visibles avec le déploiement de cette candidate mais aucune entrée DB/release/notification n’a été publiée. Les assets probants sont aussi dans `docs/screenshots/`.
- Le configurateur de formats tarifés pour les propriétaires et la sélection correspondante dans le panier client sont intégrés au code web/iOS au commit `6621c38` et consignés au changelog. La migration 0151 est appliquée en production; le code reste sur la candidate Preview. Les deux articles Magie sont configurés mais restent des brouillons inactifs jusqu’à validation de la propriétaire.
- **Sentry — 2026-09-25** : le code web envoie vers `minerva-s5m/minerva-flow-web`; iOS envoie vers `minerva-flow-ios`. Un événement web synthétique sans données personnelles est confirmé; le DSN iOS compile, mais sa réception native reste à vérifier. PII, en-têtes, cookies, corps, paramètres d’URL, données DB, journaux Sentry et Replay sont désactivés; traces à 10 % en production. Le Preview `20197a4` a téléversé les source maps et créé sa release Sentry. La ressource Marketplace `sentry-copper-notebook` (forfait Developer gratuit) existe, mais sa liaison à `minerva-flow` n’a pas fini; ne pas relancer `integration add`. Les alertes projet créées via MCP n’ont pas pu être relues; leur état reste à confirmer dans Sentry. Le jeton transmis dans la conversation doit être tourné.

- L’alerte reçue (« The destination stream closed early. », requête `/en/overview`) correspond à la fermeture d’un flux de rendu RSC; le courriel ne contenait ni frame d’erreur métier ni frame Supabase. Le signal continue d’être capturé dans Sentry, mais `lib/alerts/error-notifier.ts` classe désormais cette seule erreur transport exacte comme non critique pour éviter une alerte email trompeuse. Les erreurs différentes restent alertables.
- Le checkout natif s’ouvre immédiatement après un ajout depuis le Menu; le code Scanner a été remis en page avec QR/code temporaire, expiration, reprise d’erreur et accès caméra.
- Validation locale : Vitest 321/321, `tsc --noEmit` et lint ciblé passent. Sur iPhone 17 Pro Simulator, les 2 tests UI ciblés de navigation panier et Scanner passent. La première tentative de tests UI a échoué à cause de sélecteurs de test/accessibilité; ces sélecteurs ont été corrigés et la reprise passe.
- App Store Connect : compte démo vérifié et renseigné, notes de review et consignes de test enregistrées; politique de confidentialité renseignée. Le build iOS `1.0 (11)` est traité et « En cours de test » dans les groupes interne et externe. Le groupe externe compte 8 testeurs; lien public vérifié HTTP 200 : https://testflight.apple.com/join/xGr45uuF. La notification automatique est activée. Les autres vérifications manuelles (déclarations de confidentialité, captures et accords) restent à confirmer avant une soumission publique App Store.
- dSYM Sentry de l’archive `1.0 (11)` : UUID du framework et du DWARF dSYM vérifiés identiques (`B84D512C-9978-3080-BDCE-725FCB04589E`), corrigeant le signalement précédent.
- Journal natif « Mises à jour » ajouté au commit `bb25ec8`, poussé sur `main`; son déploiement web associé (`dpl_2G2kSTuTUECJ1LAH52H75kizmx59`) est `READY` et la racine du déploiement répond `307`. Cette modification SwiftUI n’est pas dans le build TestFlight `1.0 (11)` actuellement actif; aucun nouveau binaire iOS n’a été téléversé.
- Compilation iOS Simulator du changement réussie. Une tentative XCTest ciblant `OrderTotalsTests` s’est bloquée dans le nettoyage de session Xcode après environ 55 secondes; aucun résultat de test n’est confirmé pour cette tentative.
- **Production : NOT READY.** Le build TestFlight est disponible pour les tests externes, mais ne pas publier en production avant les E2E complets client/owner, la validation visuelle des écrans finaux, les vérifications App Store restantes et la preuve que le déploiement correspond au commit testé.

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
   - [Chantier 8 : StatStrip Condensé de l'Aperçu, Navigation Fidélisation & Contrat Pilote](#chantier-8--statstrip-condensé-de-laperçu-navigation-fidélisation--contrat-pilote)
3. [Répertoire des Fichiers Clés (Code Source & Tests)](#3-répertoire-des-fichiers-clés-code-source--tests)
4. [Schémas de Base de Données & Migrations Supabase](#4-schémas-de-base-de-données--migrations-supabase)
5. [Guide de Vérification Pas-à-Pas (Validation Complète)](#5-guide-de-vérification-pas-à-pas-validation-complète)
6. [État des Intégrations & Roadmap Résiduelle](#6-état-des-intégrations--roadmap-résiduelle)
7. [Application iOS — rôles livrés et prochaine publication](#7-application-ios--rôles-livrés-et-prochaine-publication)
8. [Session du 2026-09-10 — Synchro POS Bidirectionnelle & Infrastructure](#8-session-du-2026-09-10--synchro-pos-bidirectionnelle--infrastructure)

---

## 1. Identité de Marque & Directives Inviolables

* **Nom de marque officiel** : **`Minerva Flow`** (ou **`Flow`** en contexte abrégé dans l'interface).
* **RÈGLE STRICTE** : utiliser uniquement le nom officiel **Minerva Flow** dans les pages, courriels, documentations, métadonnées et prompts d'IA.
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
  - Affichage précis des sources de données utilisées (Square, Clover, Toast, fiches recettes, historique de commandes).
  - Fréquence de calcul et horodatage exact de la dernière synchronisation POS.
  - Indice de confiance explicite pour chaque recommandation (ex. *Indice de confiance : 92 %*).
- **Isolation étanche Restaurateur vs Développeur** :
  - Le restaurateur ne voit que des leviers d'action concrets (augmenter le prix de 0,50 $, relancer 14 habitués, ajuster la portion de frites).
  - Les détails techniques (noms de tables, statuts d'API, tokens, requêtes SQL) sont relégués dans des tiroirs d'administration ou masqués.
- **États vides exploitables** :
  - Détection contextuelle des manques : caisse non connectée, fiches techniques non renseignées, historique insuffisant (< 7 jours).
  - Checklists d'action directes avec bouton de redirection vers la bonne section de configuration.

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

### Chantier 8 : StatStrip Condensé de l'Aperçu, Navigation Fidélisation & Contrat Pilote
*Livré lors de la clôture de sprint du 15 septembre 2026 :*
1. **Épuration de l'Aperçu (`OverviewClientView.tsx`)** :
   - Suppression du bandeau supérieur redondant de portée multi-établissements (`Portée :`).
   - Condensation des 5 métriques clés dans un `StatStrip` horizontal unifié.
   - Accordéon de préparation à l'onboarding replié par défaut pour dégager l'espace d'action immédiat.
   - Recommandations et alertes Flow AI positionnées stratégiquement au bas du flux décisionnel.
2. **Navigation de Fidélisation & Tableaux Rénovés** :
   - Calibrage du tableau de clients à 6 lignes avec défilement interne et en-tête fixé (`sticky`).
   - Restauration du composant `FidelisationSubNav` sur la vue des résultats.
3. **Graphiques Consolidés dans les Rapports (`reports/page.tsx`)** :
   - Intégration du graphique d'évolution des tendances (Revenus vs Marges vs Dépenses) et sparklines sur les cartes de ratios.
4. **Cadre Juridique Officiel de Projet Pilote** :
   - Formalisation de l'entente de projet pilote Minerva Flow pour Mains Magiques ADM (`docs/contrats/ENTENTE_PROJET_PILOTE_MINERVA_FLOW.md`).
   - Fixation tarifaire bilatérale à l'issue de l'essai gratuit avec clause de sortie sans frais.
   - Compilation automatisée d'un PDF officiel de prestige de 4 pages via Playwright (`scripts/generate-contract-pdf.mjs`).

---

## 3. Répertoire des Fichiers Clés (Code Source & Tests)

### Logique Métier & Moteurs de Calcul
* [`lib/campaigns/templates.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/campaigns/templates.ts) : Définition des 8 modèles de campagnes, rendus HTML et SMS conformes LCAP, dispatch multicanal.
* [`lib/lifecycle/events.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/lifecycle/events.ts) : Moteur de capture des 15 événements de cycle de vie client, dispatch asynchrone client/serveur.
* [`lib/pos/cashier-identification.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pos/cashier-identification.ts) : Algorithmes de résolution en caisse (téléphone, pairing code 6 chiffres, QR).
* [`lib/pos/catalog-sync.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pos/catalog-sync.ts) : Synchronisation bidirectionnelle du catalogue menu et de l'inventaire avec Clover et Square.
* [`lib/pos/inventory-mapping.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pos/inventory-mapping.ts) : Appariement des articles d'inventaire aux items de caisse.
* [`lib/overview/kpi-engine.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/overview/kpi-engine.ts) : Calcul des 5 KPI de premier niveau avec comparaison J-1 et S-1.
* [`lib/pricing/plans.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pricing/plans.ts) : Structure des 3 offres (Profit Core 150$, Growth & Loyalty 290$, Enterprise 590$).

### Composants Utilisateur (UI)
* [`components/campaigns/PrioritizedCampaignsStudio.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/campaigns/PrioritizedCampaignsStudio.tsx) : Studio interactif des 8 campagnes avec toggle d'automatisation, prévisualisations et déclenchement direct.
* [`components/pos/CashierIdentificationModal.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/pos/CashierIdentificationModal.tsx) : Modal d'identification caissier optimisée pour le comptoir.
* [`components/minerva/PosInventoryMappingCard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/minerva/PosInventoryMappingCard.tsx) : Interface d'association des matières premières à la caisse POS.
* [`components/minerva/PosItemMappingCard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/minerva/PosItemMappingCard.tsx) : Carte de correspondance des articles de menu aux libellés de caisse.
* [`components/minerva/OverviewClientView.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/minerva/OverviewClientView.tsx) : Tableau de bord de synthèse orienté actions avec StatStrip unifié.
* [`app/[locale]/(app)/reports/retention-funnel/page.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/[locale]/(app)/reports/retention-funnel/page.tsx) : Tableau de bord de l'entonnoir de rétention avec les 10 KPI et les 6 profils audités.
* [`app/[locale]/(marketing)/pricing/PricingPlansView.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/[locale]/(marketing)/pricing/PricingPlansView.tsx) : Grille tarifaire moderne avec bascule mensuelle/annuelle.

### Routes API, Webhooks & Tâches Planifiées
* [`app/api/webhooks/sms/inbound/route.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/api/webhooks/sms/inbound/route.ts) : Webhook entrant Twilio gérant la désinscription automatique (STOP, ARRÊT, etc.).
* [`app/api/lifecycle/track/route.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/api/lifecycle/track/route.ts) : Point de terminaison sécurisé pour l'enregistrement des 15 événements.
* [`app/api/campaigns/unsubscribe/route.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/api/campaigns/unsubscribe/route.ts) : Désinscription en 1 clic pour les courriels.
* [`app/api/cron/pos-catalog-reconcile/route.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/api/cron/pos-catalog-reconcile/route.ts) : Endpoint de réconciliation périodique du catalogue POS.
* [`.github/workflows/cron-pos-catalog-reconcile.yml`](file:///Users/kaelbelceus/Flow%20by%20Minerva/.github/workflows/cron-pos-catalog-reconcile.yml) : Workflow GitHub Actions déclenchant la réconciliation POS toutes les 15 minutes.
* [`scripts/generate-contract-pdf.mjs`](file:///Users/kaelbelceus/Flow%20by%20Minerva/scripts/generate-contract-pdf.mjs) : Script Playwright Chromium de génération de contrat PDF haute fidélité.

### Suites de Tests Automatisés (Vitest)
* [`lib/__tests__/campaigns-and-casl-consent.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/campaigns-and-casl-consent.test.ts) : 15 tests unitaires validant les 8 campagnes, le rendu SMS/courriel et la conformité LCAP.
* [`lib/__tests__/lifecycle-retention-funnel.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/lifecycle-retention-funnel.test.ts) : Validation des 15 événements de cycle de vie et du calcul des taux d'activation/rétention.
* [`lib/__tests__/pos-customer-identification.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/pos-customer-identification.test.ts) : 11 tests sur la recherche par téléphone, le code de jumelage et les erreurs caisse.
* [`lib/pos/__tests__/clover.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pos/__tests__/clover.test.ts) : 8 tests validant l'authentification et l'échange de token Clover.
* [`lib/pos/__tests__/toast.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/pos/__tests__/toast.test.ts) : 9 tests couvrant la synchronisation Toast Partner Connect.
* [`lib/__tests__/overview-engine.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/overview-engine.test.ts) : Validation des 5 métriques, calculs de variations J-1 et S-1.
* [`lib/__tests__/pricing.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/pricing.test.ts) : Validation des plans tarifaires et des réductions annuelles.

---

## 4. Schémas de Base de Données & Migrations Supabase

Cinq migrations majeures structurent ce système :

### 1. Migration `0113_pos_catalog_sync_foundation.sql`
- Crée la table immuable `pos_inventory_mappings` reliant chaque ingrédient (`inventory_items`) à l'article correspondant sur la caisse (`clover_item_id`, `square_catalog_object_id`).
- Ajoute les colonnes de suivi de synchronisation : `last_synced_at`, `sync_status`, `error_message`.

### 2. Migration `0114_pos_item_mappings_square_variation_id.sql`
- Élargit la table `pos_item_mappings` pour stocker le `square_variation_id` requis pour les articles de menu à déclinaisons multiples (portions, tailles).

### 3. Migration `0118_retention_funnel_and_lifecycle_events.sql`
- Crée la table immuable `customer_lifecycle_events` :
  - `event_name` : Les 15 événements énumérés.
  - `restaurant_id`, `customer_id`, `source`, `metadata` (JSONB), `created_at`.
  - Politiques RLS avec indexation sur `(restaurant_id, event_name, created_at)`.

### 4. Migration `0119_casl_consent_and_retention_automations.sql`
- Crée la table immuable d'audit `customer_consents` :
  - `customer_id`, `consent_type` (`express_marketing`, `terms_service`), `status` (`granted`, `revoked`).
  - `channels` (`sms`, `email`), `exact_legal_text`, `ip_address`, `user_agent`, `created_at`.
- Élargit la table `restaurants` avec les colonnes de configuration des automatisations :
  - `campaign_welcome_enabled`, `campaign_second_visit_enabled`, `campaign_reactivation_21d_enabled`, `campaign_off_peak_enabled`.
- Élargit la table `customers` :
  - `sms_marketing_consent`, `email_marketing_consent`, `consent_source`, `consent_timestamp`, `unsubscribed_at`.

### 5. Migration `0120_additional_campaign_templates_and_triggers.sql`
- Élargit l'énumérateur `retention_trigger_type` :
  - Ajout des triggers : `'welcome'`, `'second_visit'`, `'off_peak'`, `'vip_upgrade'`, `'referral_share'`, `'winback_60d'`.
- Ajoute les colonnes de configuration restaurant :
  - `campaign_reward_available_enabled`, `campaign_vip_upgrade_enabled`, `campaign_referral_share_enabled`, `campaign_winback_60d_enabled`.

---

## 5. Guide de Vérification Pas-à-Pas (Validation Complète)

Pour vérifier l'intégrité absolue de la livraison :

### Étape 1 : Vérification Statique TypeScript
Exécuter la commande suivante à la racine du projet :
```bash
npx tsc --noEmit
```
*Résultat validé* : Sortie propre avec code de retour `0` (**zéro erreur de typage**).

### Étape 2 : Exécution de la Suite Complète des Tests Vitest
Exécuter la suite complète :
```bash
npm run test
```
*Résultat validé* : **28 fichiers de tests passés avec succès (28 passed), 161 tests unitaires réussis (161 passed)** en ~6.0 secondes.

### Étape 3 : Vérification Spécifique des Campagnes & de la LCAP
Exécuter le test ciblé :
```bash
npm run test lib/__tests__/campaigns-and-casl-consent.test.ts
```
*Vérifications automatisées* :
1. Rendu HTML de chacun des 8 modèles avec footer légal et lien de désinscription.
2. Rendu SMS des 8 modèles incluant obligatoirement la mention `RÉPONDRE STOP POUR ARRÊTER`.
3. Validation du blocage d'envoi si le client n'a pas donné son consentement exprès.
4. Validation de la révocation immédiate en cas de webhook `STOP`.

### Étape 4 : Parcours Visuel & Navigation Web
1. Démarrer le serveur de développement : `npm run dev`
2. **Aperçu** (`/overview`) :
   - Vérifier le `StatStrip` horizontal condensé des 5 KPI avec comparaison J-1 et S-1.
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
| **Moteur d'Événements (15)** | **Opérationnel (100 %)** | Ingestion asynchrone client/serveur via Supabase |
| **8 Modèles de Campagnes** | **Opérationnel (100 %)** | Rendus SMS/Courriel, tests unitaires et UI complétés |
| **Conformité LCAP / CASL** | **Opérationnel (100 %)** | Double opt-in, table d'audit immuable, webhook STOP |
| **Identification en Caisse** | **Opérationnel (100 %)** | Téléphone tolérant, code 6 chiffres RPC, modal caissier |
| **Tâches Planifiées (Crons)** | **Opérationnel (100 %)** | 12 workflows GitHub Actions (`schedule`) avec jeton `CRON_SECRET` |
| **Square POS** | **Prêt en Production** (Validation Sandbox) | OAuth avec scopes d'écriture élargis (`ITEMS_WRITE`, `INVENTORY_WRITE`), synchro bidirectionnelle catalogue + inventaire |
| **Clover POS** | **Prêt en Production** (Validation Sandbox) | Connexion par Merchant ID + Token API direct et flux OAuth, synchro catalogue |
| **Toast POS** | **Prêt en Production** | Intégration Partner Connect / Machine-to-Machine, tests unitaires validés (9/9) |
| **Lightspeed Restaurant** | Code OAuth prêt | En attente d'un compte sandbox partenaire Lightspeed |
| **Pass Apple Wallet** | Scannable par QR / code | Génération de fichier `.pkpass` natif planifiée post-MVP |
| **Paiement Stripe Connect** | Opérationnel sur `/m/[token]` | Portail marchand `/portal` prêt pour raccordement direct |

---

## 7. Application iOS — rôles livrés et prochaine publication

L’application SwiftUI utilise un seul bundle et dirige chaque compte vers une expérience client ou propriétaire/gérant après résolution du rôle.

### 7.1 Parcours existants

- **Client** : accueil, restaurants et menus, commande lorsque le restaurant l’a activée, code de fidélité, offres, cartes, profil et partage de parrainage.
- **Propriétaire/gérant** : Aperçu, Commandes, Menu, Fidélisation et Gestion. Les autres fonctions d’administration demeurent principalement dans l’application web.
- **iPad** : navigation à colonnes en taille régulière et orientations portrait/paysage.
- **Identification en caisse** : la recherche par téléphone masque le solde jusqu’à confirmation avec le code temporaire à six chiffres du client; le code présenté directement permet aussi de retrouver le compte.
- **Parrainage** : canal QR/partage/lien/code/direct conservé avec les événements; l’activité de conversion n’est comptabilisée qu’après crédit de la conversion.

### 7.2 État de publication au 24 septembre 2026

- iOS `1.0 (11)` : archive Release et IPA exportés; UUID du dSYM Sentry vérifié contre le framework.
- TestFlight : build `1.0 (11)` traitée et en test dans les groupes interne et externe; 8 testeurs externes, lien public HTTP 200, notification automatique activée. Le build actif ne contient pas le journal natif du commit `bb25ec8`.
- Source iOS : compilation Simulator réussie. Les 2 tests UI panier/Scanner ont passé sur la version antérieure testée; la tentative XCTest après `bb25ec8` est bloquée par le runner et n’a pas produit de résultat. Aucun build 12 ni nouvel upload TestFlight.
- Audit App Store statique du 24 septembre : 0 risque critique, 0 élevé et 2 avertissements; les contrôles manuels de démonstration, métadonnées/captures, confidentialité, notes de review et accords restent à confirmer avant une soumission publique.
- Git : commit `bb25ec8` poussé sur `main`. Déploiement Vercel de production associé `dpl_2G2kSTuTUECJ1LAH52H75kizmx59` en état `READY`; smoke HTTP racine `307` (redirection prévue). Pas de GitHub Release ni de nouvelle release iOS publiée.
- Le compte propriétaire natif est livré comme une tranche opérationnelle; ne pas lui attribuer les écrans/alertes de la roadmap non implémentés.
- La livraison dynamique au tarif par distance/temps, Android white-label et l’automatisation d’une app par restaurant restent à traiter comme objectifs, sauf validation d’un déploiement spécifique.

Voir [`docs/MOBILE_APP_AUDIT_AND_ROADMAP.md`](docs/MOBILE_APP_AUDIT_AND_ROADMAP.md) pour les contrôles requis avant diffusion.

---

## 8. Session du 2026-09-10 — Synchro POS Bidirectionnelle & Infrastructure

La session du 10 septembre 2026 a apporté deux consolidations architecturales majeures au cœur du système :

### 8.1 Moteur de Synchronisation Bidirectionnelle du Catalogue (Clover & Square)
Auparavant, les intégrations de caisse se limitaient à la lecture des tickets et à l'agrégation du chiffre d'affaires. Le nouveau moteur (`lib/pos/catalog-sync.ts`) assure une synchronisation **bidirectionnelle complète** du menu et de l'inventaire :
- **Push descendant (Minerva Flow ➔ POS)** :
  - Toute modification de plat (prix, intitulé, disponibilité) ou mouvement de stock (réception, perte, ajustement d'ingrédient) est transmise immédiatement à l'API de caisse correspondante.
- **Pull ascendant & Réconciliation périodique (POS ➔ Minerva Flow)** :
  - Le workflow planifié `.github/workflows/cron-pos-catalog-reconcile.yml` invoque la route `/api/cron/pos-catalog-reconcile` toutes les 15 minutes.
  - La logique applique une règle *last-write-wins* en comparant `external_updated_at` (POS) et `local_synced_at` (Flow) pour résoudre automatiquement les conflits sans écraser de modifications légitimes faites sur le terminal physique.
- **Gestion des Déclinaisons Multiples** :
  - Prise en charge du `square_variation_id` dans `pos_item_mappings` pour mapper avec précision les différentes tailles et variantes de plats vendus.

### 8.2 Élargissement des Permissions OAuth Square & Méthode Directe Clover
- **Résolution du risque 403 sur Square** :
  - Le flux OAuth initial de Square n'exigeait que des permissions de lecture. Il a été étendu dans `app/api/oauth/square/route.ts` avec les scopes `ITEMS_WRITE` et `INVENTORY_WRITE`, permettant les modifications de catalogue et d'inventaire sans blocage d'autorisation.
- **Connexion Directe Clover** :
  - Ajout de la possibilité de connecter un compte Clover directement via la saisie du `Merchant ID` et du jeton d'API marchand (`API Token`), offrant une alternative immédiate au flux OAuth complet.

### 8.3 Migration Critique des Tâches Planifiées vers GitHub Actions
- **Contrainte Détectée** : Le plan Vercel Hobby plafonne strictement les Cron Jobs natifs à **2 tâches par projet, exécutables au maximum une fois par jour**. Avec 12 tâches planifiées nécessaires au bon fonctionnement de Flow (réconciliation POS 15 min, alertes, relances, clôtures, etc.), les déploiements Vercel déclenchaient des avertissements et bloquaient l'exécution des crons sous-journaliers.
- **Solution Déployée** :
  - Migration complète des 12 crons vers des workflows GitHub Actions situés dans `.github/workflows/cron-*.yml`.
  - Chaque workflow utilise un déclencheur `schedule` (cron syntax) et appelle l'API de production via un `curl` sécurisé par l'en-tête `Authorization: Bearer ${{ secrets.CRON_SECRET }}`.
  - La section `crons` de `vercel.json` a été vidée pour assainir les builds de production Vercel.

---

<div align="center">

*Minerva Flow — Système d'Exploitation & d'Analyse pour Restaurants*  
*Minerva Technologies Inc. · Document officiel de passation et de conformité opérationnelle.*

</div>
