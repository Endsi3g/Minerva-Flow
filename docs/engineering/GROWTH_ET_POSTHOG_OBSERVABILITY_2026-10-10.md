# Minerva Flow — Documentation des Mises en Place : Growth, Observabilité PostHog & IA

> **Date** : 10 octobre 2026  
> **Auteur** : Minerva Flow Engineering & Growth  
> **Contexte** : Diagnostic PostHog du 5–7 octobre, optimisation de l'onboarding (taux initial ~15%), monitoring des sessions et instrumentation de l'IA.

---

## 1. Synthèse Exécutive

Dans le cadre de l'audit de conversion et d'observabilité applicative, plusieurs chantiers critiques ont été investigués et mis en production :
1. **Observabilité IA intégrale (Vercel AI SDK + OpenTelemetry + PostHog)** : traçabilité complète des requêtes d'intelligence artificielle (Flow AI, menu extraction, reviews).
2. **PostHog Replay Vision & Détection d'Anomalies** : 3 scanners intelligents pour monitorer la frustration des utilisateurs, les blocages d'onboarding et résumer les sessions en français.
3. **Optimisation IA & Cloudflare AI Gateway** : migration du modèle par défaut vers **Gemma 3 27B** (`@cf/google/gemma-3-27b-it`), sans coût additionnel sur Cloudflare Workers AI.
4. **Architecture A/B Testing Onboarding & Anti-Objections** :
   - Moteur de navigation séquentielle arbitraire (`stepSequence`) dans le composant d'onboarding.
   - Feature flag PostHog `onboarding-step-order` comparant l'ordre classique (`[1, 2, 3, 4, 5]`) à l'ordre inversé avec offre précoce (`[1, 4, 2, 3, 5]`).
   - Section FAQ anti-objections éditoriale intégrée au palier 4 (rémunération, souveraineté des données, sans engagement, setup < 5 min).
   - Tracking télémétrique enrichi pour chaque étape visualisée et chaque variante assignée.

---

## 2. Observabilité IA (PostHog AI Observability)

### 2.1 Architecture
Le projet utilise le SDK Vercel AI (`ai`, `@ai-sdk/google`) orchestré avec `@posthog/ai/otel` et le SDK OpenTelemetry Node :
- **Fichier d'initialisation** : [`lib/ai/observability.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/ai/observability.ts)
- **Bootstrap** : [`instrumentation.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/instrumentation.ts) lance `initializeAiObservability()` au démarrage du runtime Node.js.
- **Identifiants** : `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` et `POSTHOG_HOST` résolus dynamiquement depuis l'environnement (projet PostHog `575536`).

### 2.2 Chemins instrumentés
| Chemin | Nom de la Trace (`$ai_trace_name`) | Contexte & Attribution |
| :--- | :--- | :--- |
| **Flow AI Chat** | `flow_ai_chat` | `conversationId` mappé en `$ai_session_id`, `distinct_id` lié à l'utilisateur authentifié. Les appels d'outils (`createArtifact`) sont imbriqués comme tool spans. |
| **Insights Menu** | `menu_insights` | Génération one-shot sans session inventée. |
| **Avis Clients IA** | `ai_review` / `gemini_review` | Passage via Cloudflare AI Gateway ou fallback Vercel AI `generateText` avec télémétrie. |
| **Extraction de Menu** | `menu_extraction` | Génération structurée one-shot (`generateObject`) avec flush explicite des spans en fin de traitement. |

### 2.3 Protection de la Vie Privée
- Les prompts et complétions sont suivis pour l'analyse de qualité.
- Pour exclure des données sensibles de PostHog sur un appel spécifique, il suffit de passer `recordInputs: false` et/ou `recordOutputs: false` dans l'objet de télémétrie.

---

## 3. PostHog Replay Vision & Alertes Applicatives

### 3.1 Scanners Replay Vision configurés (Projet `575536`)
Trois scanners ont été créés et déployés sur l'environnement de production :

1. **Onboarding wizard frustration (Monitor)**
   - **Cible** : Détecte les `$rageclick` et les signes d'incompréhension dans le wizard d'onboarding (bouton continuer bloqué sur la validation du nom, QR code vide, taux de points/dollar rejeté).
   - **Échantillonnage** : 1.0 (exhaustif sur sessions consenties).
   - **Lien PostHog** : [Replay Vision Frustration](https://us.posthog.com/project/575536/replay-vision/01a126e8-08a7-7e8e-b110-8b0970a4b653)

2. **Onboarding wizard breakage (Monitor)**
   - **Cible** : Détecte les bugs francs et écrans figés sur les URL `/sign-up` et `/onboarding`.
   - **Échantillonnage** : 0.5.
   - **Lien PostHog** : [Replay Vision Breakage](https://us.posthog.com/project/575536/replay-vision/01a126e9-df66-7474-842c-84afc5351957)

3. **Résumés de session Flow (Summarizer)**
   - **Cible** : Résumés automatiques en français des parcours utilisateurs à travers toute l'application.
   - **Statut** : Créé en mode désactivé initialement afin de valider les premiers aperçus avant activation continue.
   - **Lien PostHog** : [Replay Vision Summaries](https://us.posthog.com/project/575536/replay-vision/01a126e5-12df-7a54-aba3-24f586198a52)

### 3.2 Alerte d'Erreurs Applicatives
- **Alerte active** : *« Pic d'erreurs applicatives (> 5/jour) »* sur l'insight [Erreurs applicatives](https://us.posthog.com/project/575536/insights/KEhwejPD/alerts?alert_id=01a12705-0d59-0000-1e3e-9243648c7e02).
- Notifie l'équipe dès que les erreurs dépassent le seuil de 5 événements par jour.

### 3.3 Note sur le Session Replay et la Loi 25 (Québec)
Le faible volume apparent d'enregistrements (~0,5%) est dû au respect strict de la Loi 25 québécoise et des normes CASL : les enregistrements ne s'activent qu'après consentement explicite de l'utilisateur (`lib/analytics-consent.ts`). Pour augmenter la couverture en phase de test, le taux peut être ajusté temporairement à 100% dans les paramètres PostHog.

---

## 4. Modèle IA : Gemma 3 via Cloudflare Workers AI

- **Fichier modifié** : [`lib/ai/cloudflare.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/ai/cloudflare.ts)
- **Changement** :
  ```diff
  - export const CLOUDFLARE_DEFAULT_MODEL = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  + export const CLOUDFLARE_DEFAULT_MODEL = "workers-ai/@cf/google/gemma-3-27b-it";
  ```
- **Avantages** :
  - Modèle Google Gemma 3 27B hautement optimisé pour l'instruction et la structure JSON.
  - Exécution gratuite sur Cloudflare Workers AI sans quota facturé par token d'API externe.
  - Routage transparent via le Cloudflare AI Gateway (`accountId: e4826a36912d92d343151792bb44fd46`).

---

## 5. Moteur d'Onboarding & A/B Testing

### 5.1 Navigation séquentielle arbitraire (`stepSequence`)
Auparavant, le wizard d'onboarding (`components/ui/onboarding.tsx`) imposait un parcours strictement incrémental (`1 -> 2 -> 3 -> 4 -> 5`).  
Le composant a été refactorisé pour supporter une navigation arbitraire :
- **Fichier** : [`components/ui/onboarding.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/ui/onboarding.tsx)
- Ajout de la prop `stepSequence?: number[]` dans `OnboardingRoot`.
- Calcul dynamique :
  - `seqIndex = stepSequence.indexOf(currentStep)`
  - `isLastStep = seqIndex === stepSequence.length - 1`
  - Navigation Précédent/Suivant adaptée à l'ordre configuré.
- Exposition de `isLastStep` dans `OnboardingContextValue` pour éviter les calculs manuels dans les composants enfants.

### 5.2 Feature Flag PostHog `onboarding-step-order`
- **Fichier** : [`components/onboarding/OnboardingWizard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/onboarding/OnboardingWizard.tsx)
- **Variantes supportées** :
  1. `"classic"` : `[1, 2, 3, 4, 5]` (Profil -> Qualification -> Fidélité -> Offre -> Lancement)
  2. `"offer-first"` : `[1, 4, 2, 3, 5]` (Profil -> Offre/Pricing -> Qualification -> Fidélité -> Lancement)
- **Attribution & Fallback** :
  - Récupération du flag depuis `posthog.getFeatureFlag("onboarding-step-order")`.
  - En l'absence de réponse immédiate du SDK, répartition déterministe 50/50 basée sur le hash du `userId`.
  - Capture de l'événement PostHog : `onboarding_step_order_assigned { variant, step_sequence }`.

### 5.3 Accordéon FAQ Anti-Objections (Étape Offre)
Pour éliminer les blocages psychologiques avant l'acceptation de l'offre (Étape 4), un accordéon accessible avec rotation d'icône a été ajouté, disponible en français et en anglais :
1. **Rémunération** : *"Comment êtes-vous rémunéré ?"*  
   *« Une petite part des revenus additionnels que nous mesurons ensemble — et rien si vos revenus n'augmentent pas. Aucun frais fixe, jamais. »*
2. **Propriété des données** : *"Mes données clients m'appartiennent-elles ?"*  
   *« Oui, à 100 %. Vos listes de clients sont exportables en un clic depuis votre tableau de bord. Minerva Flow ne vend ni ne partage vos données. »*
3. **Résiliation** : *"Puis-je annuler quand je veux ?"*  
   *« Oui, sans pénalité et sans préavis minimum. Résiliation en tout temps, depuis vos paramètres. »*
4. **Temps de configuration** : *"Combien de temps pour configurer ?"*  
   *« Moins de 5 minutes ici. Votre QR code est prêt avant la fin de cet onboarding. »*

### 5.4 Indicateurs et Pied de Page Séquentiels
- **`ProgressHeader`** : affiche la position visuelle dans la séquence (ex. étape 2 sur 5 même si l'étape logique est 4) et envoie à PostHog :
  ```json
  {
    "step": 4,
    "visual_position": 2,
    "total_steps": 5,
    "step_name": "offer"
  }
  ```
- **`WizardFooter`** : utilise désormais `handleNext()` et `isLastStep` fournis par le contexte, éliminant les sauts de step erronés (`setStep(step + 1)`).

---

## 6. Synthèse des Fichiers Modifiés & Créés

| Fichier | Nature | Description |
| :--- | :--- | :--- |
| [`components/ui/onboarding.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/ui/onboarding.tsx) | Modification | Support de `stepSequence`, refactorisation de `OnboardingNavigation` et ajout de `isLastStep`. |
| [`components/onboarding/OnboardingWizard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/onboarding/OnboardingWizard.tsx) | Modification | Intégration du flag `onboarding-step-order`, FAQ anti-objections, événements intermédiaires `onboarding_step_completed`, `onboarding_step_failed`, `onboarding_completed` côté client, et `onboarding_qr_copied`. |
| [`native/ios/MinervaFlow/Sources/Models.swift`](file:///Users/kaelbelceus/Flow%20by%20Minerva/native/ios/MinervaFlow/Sources/Models.swift) | Modification | Résolution du `DecodingError` dans `NativeOwnerBranding` avec `CodingKeys` explicites et décodage résilient avec fallbacks par défaut. |
| [`native/ios/MinervaFlow/Sources/SupabaseManager.swift`](file:///Users/kaelbelceus/Flow%20by%20Minerva/native/ios/MinervaFlow/Sources/SupabaseManager.swift) | Modification | Sécurisation de `loadSelectedOwnerBranding()` avec `.limit(1)` pour éviter les erreurs PGRST116. |
| [`components/providers/StaleDeploymentReloader.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/providers/StaleDeploymentReloader.tsx) | Nouveau | Intercepteur client automatique sur `UnrecognizedActionError` / version skew avec cooldown de sécurité. |
| [`next.config.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/next.config.ts) | Modification | Déclaration de `deploymentId` pour la détection native du version skew Next.js. |
| [`app/[locale]/layout.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/[locale]/layout.tsx) | Modification | Montage du composant `StaleDeploymentReloader` dans l'arbre racine. |
| [`lib/__tests__/stale-deployment-reloader.test.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/__tests__/stale-deployment-reloader.test.ts) | Nouveau | Tests unitaires validant la détection des erreurs de Server Action obsolète. |
| [`lib/ai/cloudflare.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/ai/cloudflare.ts) | Modification | Configuration par défaut sur `workers-ai/@cf/google/gemma-3-27b-it`. |
| [`lib/ai/observability.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/ai/observability.ts) | Nouveau | Processeur OpenTelemetry et enrichissement des traces PostHog AI. |
| [`instrumentation.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/instrumentation.ts) | Modification | Démarrage automatique de l'observabilité IA au boot du runtime Node. |
| [`posthog-ai-observability-report.md`](file:///Users/kaelbelceus/Flow%20by%20Minerva/posthog-ai-observability-report.md) | Documentation | Rapport d'intégration Vercel AI SDK / PostHog. |
| [`posthog-replay-vision-report.md`](file:///Users/kaelbelceus/Flow%20by%20Minerva/posthog-replay-vision-report.md) | Documentation | Rapport de configuration des 3 scanners Replay Vision. |

---

## 7. Résolution des 3 Erreurs Critiques PostHog

1. **`AuthApiError: Invalid login credentials`** ([Issue `01a126fc-b71a`](https://us.posthog.com/error_tracking/01a126fc-b71a-74c3-839d-15d7e783983e)) :
   - Corrigé dans [`components/auth/AuthCard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/auth/AuthCard.tsx).
   - Les identifiants invalides mettent à jour l'UI locale directement sans propager d'exception vers PostHog.
2. **`Error: Votre compte est déjà créé dans l'application...`** ([Issue `01a126fc-952f`](https://us.posthog.com/error_tracking/01a126fc-952f-7311-84bf-1e7df61aef6f)) :
   - Corrigé dans [`components/auth/AuthCard.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/auth/AuthCard.tsx).
   - Basculement automatique en mode connexion (`mode = "login"`) avec conservation de l'email et sans `throw new Error(...)`.
3. **`Error: Paper Shaders: WebGL is not supported in this browser`** ([Issue `01a0d0cc-d105`](https://us.posthog.com/error_tracking/01a0d0cc-d105-7cf1-a398-5814688b89e5)) :
   - Corrigé dans [`components/auth/AuthShell.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/auth/AuthShell.tsx) et [`components/ui/auth-section-1.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/components/ui/auth-section-1.tsx).
   - Détection synchrone WebGL avant montage + `ShaderErrorBoundary` React + repli en dégradé CSS multicouche chaud.

---

## 8. Entonnoir d'Onboarding dans PostHog & Tableau de Bord Interne

### 8.1 Configuration de l'Insight Funnel dans PostHog (Projet `575536`)
URL directe de création : [`https://us.posthog.com/project/575536/insights/new?insight=FUNNELS`](https://us.posthog.com/project/575536/insights/new?insight=FUNNELS)

Étapes ordonnées de l'entonnoir :
1. `onboarding_step_viewed` avec filtre `step = 1` *(Profil établissement démarré)*
2. `onboarding_step_completed` avec filtre `step = 1` *(Établissement validé)*
3. `onboarding_step_completed` avec filtre `step = 2` *(Qualification & Objectifs validés)*
4. `onboarding_step_completed` avec filtre `step = 3` *(Programme fidélité configuré)*
5. `onboarding_step_completed` avec filtre `step = 4` *(Offre commerciale sélectionnée)*
6. `onboarding_step_completed` avec filtre `step = 5` *(Lancement & Équipe confirmés)*
7. `onboarding_completed` *(Onboarding terminé & compte actif, avec `$session_id` pour Session Replay direct)*

### 8.2 Intégration Native dans le Dashboard `/admin/analytics`
- Fonction `getOnboardingFunnel(days = 30)` ajoutée dans [`lib/data/posthog-insights.ts`](file:///Users/kaelbelceus/Flow%20by%20Minerva/lib/data/posthog-insights.ts).
- Rendu graphique de l'entonnoir dans [`app/[locale]/admin/analytics/AnalyticsInsightsView.tsx`](file:///Users/kaelbelceus/Flow%20by%20Minerva/app/[locale]/admin/analytics/AnalyticsInsightsView.tsx) avec les métriques :
  - Nombre total de restaurateurs ayant démarré
  - Nombre total ayant complété
  - Taux de complétion global (%)
  - Pourcentage de conversion et pourcentage de déperdition (*dropoff rate*) à chaque étape.

