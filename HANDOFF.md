# HANDOFF & DOSSIER DE VÉRIFICATION — MINERVA FLOW

## Refonte UI/UX de l'app iOS propriétaire — phase 1 (10 octobre 2026, branche `feat/native-owner-redesign`)

- **Comptes de démo permanents** (production) : propriétaire `apple-review-owner@minervaflow.app` (rôle `owner` sur « Minerva Flow — Démonstration Apple » **et** « Minerva Flow — Démo »), client `apple-review-client@minervaflow.app` (carte de fidélité dans les deux restaurants). Mot de passe unique simplifié, conservé dans `docs/private/APP_STORE_REVIEW_CREDENTIALS.json` (ignoré par Git). **Les identifiants saisis dans App Store Connect, s'il y en a, ne sont plus à jour.** Recommandé : un mot de passe distinct par compte avant toute revue Apple.
- **Données de démo ajoutées en production** (restaurant `is_demo`, « Démo ») : 3 commandes « soumise », ventes d'octobre (`service_days`), 8 articles d'inventaire, 4 employés. Aucune donnée réelle touchée.
- **Bug corrigé** : un compte avec rôle propriétaire/gestionnaire arrivait sur l'inscription client. `SupabaseManager.loadPortalData` ouvre maintenant l'espace propriétaire par défaut; « Espace client » (Compte) mémorise le choix par compte (`preferredWorkspace.<uid>`). Le lieu actif est mémorisé (`selectedOwnerRestaurant.<uid>`) et les ventes suivent le lieu sélectionné.
- **Nouvel espace propriétaire** (`OwnerUI.swift`, `OwnerOverviewScreen`, `OwnerOrdersScreen`, `OwnerManageScreens`, `OwnerLoyaltyScreen`, `OwnerAccountScreen`) : onglets Aperçu, Commandes, Gestion, Fidélité, Compte; un seul sélecteur de lieu; détail de commande natif (articles, taxes, téléphone, note, délai) avec actions Accepter/Préparer/Prête/Servie/Refuser; ajout d'article au menu (brouillon masqué si allergènes non confirmés) et d'article d'inventaire; écran de configuration web affiché **une seule fois** par compte et par appareil (`ownerWebSetupNoticeSeen.<uid>`).
- **Accueil et connexion** simplifiés et génériques; en-tête de connexion aligné à gauche (bug du logo décalé); wordmark sans italique.
- **PostHog** (`Analytics.swift`, même projet que le web) : écrans, étapes de connexion, erreurs (opération + type seulement), actions propriétaire. Aucun courriel, nom, téléphone ni contenu de commande. Désactivé dans les builds de test. **Enregistrement des sessions : OFF par défaut**, activé seulement si la personne coche la case à la création de compte ou le réglage « Enregistrer mes sessions » (Paramètres propriétaire, Confidentialité client). Mode wireframe, textes et images masqués, télémétrie réseau désactivée. Le replay doit aussi être activé dans les paramètres du projet PostHog.
- **À faire dans App Store Connect avant la prochaine publication** : déclarer dans App Privacy « Product Interaction », « User ID » et « Other User Content » (replay, optionnel), liés à l'identité, usage Analytics, sans suivi inter-apps; mettre à jour la politique de confidentialité (PostHog sous-traitant, opt-in replay, retrait possible). `PrivacyInfo.xcprivacy` est déjà à jour.
- **Prix retirés (web)** : la page Facturation affiche une offre à la performance (aucun prix, forfait IA retiré, table des forfaits supprimée); prix retirés des conditions d'utilisation et des fenêtres de mise à niveau. La logique d'abonnement existante reste pour les anciens abonnés.
- **Machine de dev** : le disque est presque plein (Xcode, simulateurs). Build local : `xcodegen generate` puis `xcodebuild … CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES` (une build non signée ne peut pas écrire dans le trousseau du simulateur). Connexion de test : `SIMCTL_CHILD_MV_TEST_EMAIL/PASSWORD` + `-minervaUITestAuth`.
- **Vérifié de bout en bout (simulateur iPhone 17 Pro + API avec la session propriétaire)** : connexion propriétaire/client, Aperçu, Commandes (Accepter → Acceptée), détail de commande, Gestion, Inventaire, ajout d'article au menu (ligne créée dans « Démo », brouillon masqué sans allergènes confirmés), lectures Équipe et Finances (200). **Bug réel trouvé et corrigé** : ajouter un article d'inventaire sans seuil échouait (déclencheur `notify_inventory_low_stock` écrivait NULL dans `inventory_low_stock_state.is_low`). Migration `0185_inventory_low_stock_null_par_level.sql` **appliquée en production** (aussi consignée dans `supabase/migrations/README.md`); insertion sans seuil revalidée (201), lignes de test supprimées. Pas encore appliquée à la préproduction.
- **Consentement replay** : case optionnelle à la création de compte (code courriel / mot de passe) + réglage dans Paramètres. Les connexions Apple/Google n'affichent pas la case : le réglage reste OFF par défaut. `PrivacyInfo.xcprivacy` : Product Interaction, User ID, Other User Content (Analytics, liés, sans suivi).
- **Sales deck (performance, sans prix)** : artefact privé https://claude.ai/artifact/56dLdC1q3FxSN9wJ4gKbmM — 11 diapositives : contexte (Restaurants Canada T2 2026), attente des clients (Bond 2026, LoyalT 2025, Tims), preuves et limites (effet brut vs corrigé ÷ 7), fonctionnement, formule gain = part des ventes via membres × hausse de dépense avec scénarios illustratifs (café 14 $, 6 000 transactions/mois), mesure avec groupe témoin, offre à la performance, démarrage proposé en 6 semaines, prochaine étape, sources. Promesse formulée comme **objectif calculé sur les données du client**, pas comme moyenne garantie; Clover décrit « en déploiement ». À faire relire juridiquement (Loi sur la concurrence, Loi sur la protection du consommateur) avant diffusion.
- **iPad : non validé.** Le Mac de dev est saturé (charge > 150, mémoire libre quasi nulle, disque à ~99 %); l'app iPad (iPad Pro 13" M5) reste sur « Préparation de votre espace… » plus de 5 minutes sans conclure, sans plantage enregistré. Impossible de distinguer lenteur machine et boucle de mise en page tant que la machine n'est pas libérée. À refaire machine au repos (libérer disque et mémoire, fermer le navigateur Comet et les serveurs Next en arrière-plan).
- **Restant** : validation iPad, envoi réel PostHog (drapeau `-minervaAnalyticsDebug`, aucune clé API personnelle PostHog disponible localement), parcours client complet (commande de bout en bout), tests Rapports/Équipe/Finances à l'écran (lectures API déjà en 200). Rien n'est publié ni déployé; TestFlight non touché.

## Icône Clover confirmée — contrôle de la session propriétaire

- Icône téléversée par Kael, visible après actualisation de la fiche; checklist **Add an App Icon complète**. Type **Web** confirmé. **Deux exigences restantes** : capture et vidéo fonctionnelle. `Submit for Approval` reste désactivé, application DRAFT.
- La session Clover développeur est authentifiée. L’accès à `https://www.minervaflow.app/overview` dans Comet retourne au formulaire de connexion; session propriétaire et autorisation marchande non vérifiées. La question sur la session exacte reste à résoudre.
- Les commandes navigateur souris et clavier ont signalé des délais dépassés; la checklist est ensuite réellement apparue. Ne pas considérer un délai comme absence de mutation et ne pas rejouer une sauvegarde sans vérifier son résultat. Aucun contournement via commandes natives du navigateur.
- Preuve privée : `.verify-artifacts/20261010T023000Z-clover-submission-checklist/icon-complete.jpg`. Aucune soumission, annonce ou promotion Production.

## Type Clover Web enregistré et préparation des médias — 10 octobre 2026

- **Type corrigé et sauvegardé : Web uniquement.** App Settings affiche `REST Clients`; section Android APKs disparue. Checklist recontrôlée : App Type **Web**, configuration complète, **3 tâches restantes** — icône, capture et vidéo. Les demandes précédentes d’aide manuelle sur le type sont dépassées.
- Le clic/Space sur une carte de groupe ne retirait pas les générations enregistrées. La suppression de Station 2018 a d’abord été sauvegardée, puis les icônes des cases de chaque génération Flex, Mini, Station Duo et Station Solo ont été cliquées dans leurs menus visibles. Les cases décochées ont été observées avant sauvegarde; résumé serveur puis checklist Web confirmés après rendu.
- Icône PNG `public/icon-512.png` contrôlée : 512 × 512. Formulaire ouvert dans `907150464`; import manuel déjà demandé après les trois refus d’accès fichiers. Aucun nouveau téléversement tenté sans changement de cette autorisation.
- Éditeur des captures ouvert dans `907150503`; dimensions visibles 360 × 640 minimum, 1920 × 1080 maximum. Captures web locales inspectées, mais anciennes et issues du mode démonstration : elles ne sont pas téléversées comme preuves actuelles. Aucun enregistrement vidéo disponible.
- Kael indique session propriétaire et Clover Sandbox connectés. L’onglet d’application visible dans Comet est toujours `/login`; question sur le navigateur et l’URL exacte en attente. **Connexion marchande non confirmée par l’agent**. Ne pas confondre réponse utilisateur, session développeur et autorisation marchande de l’application.
- Plan précis des captures et vidéo : `docs/engineering/CLOVER_VISUELS_EXAMEN.md`. Pas de lien vidéo inventé, pas de soumission, annonce ou promotion Production.

## Clover reconnecté : checklist contrôlée — 10 octobre 2026

- Reconnexion effectuée par Kael, confirmée dans Comet. Le blocage de session ci-dessous est résolu. **Compte développeur : VERIFYING ACCOUNT**, dossier soumis le 9 octobre; approbation non obtenue. Aucune modification de l’identité, des coordonnées du compte ou acceptation d’accord.
- Checklist réelle consultée puis revérifiée : **4 tâches restantes** — APK Clover, icône, capture d’écran et vidéo fonctionnelle. Description fonctionnelle maintenant marquée complète. `Submit for Approval` est **désactivé**, application toujours **DRAFT**.
- Description fonctionnelle enregistrée et relue dans Overview. Elle explique les 11 droits, l’isolement par restaurant, les brouillons du catalogue, les associations durables, les paiements prévus et les limites. Elle commence par **PREPARATION DRAFT — NOT READY FOR PUBLIC LAUNCH**; paiement/clients/export ne sont pas présentés comme disponibles ou testés. Ajuster ce texte et fournir les preuves réelles avant soumission.
- Type toujours Android & Web. Inspection du menu visible puis essai clavier d’une désélection sans résultat conservé; formulaire annulé sans sauvegarde. Réglage **Web uniquement** demandé à Kael dans l’onglet `907150496`, conservé en handoff. Ne pas téléverser l’APK Android destiné aux clients dans Clover pour satisfaire artificiellement une exigence de terminal.
- Checklist conservée dans l’onglet `907150464`; capture affichée par l’outil. Import manuel du logo précédemment demandé, toujours non confirmé. Le Canada gratuit et le webhook ne sont toujours pas vérifiés/configurés complètement.
- **Aucune soumission, publication, opération financière, annonce ou promotion Production.** Les essais marchands, vidéo et captures réelles restent indispensables.

## Reprise de soumission Clover — 10 octobre 2026

- Kael demande de poursuivre et de sortir l’application du brouillon. **Aucune soumission effectuée.** Le bouton `Submit App` a redirigé vers la connexion Clover; la session authentifiée est expirée. La demande de reconnexion est déjà en attente, ne pas la répéter ni récupérer des identifiants depuis le navigateur.
- **Comet reste contrôlable**, fournisseur `2`. L’onglet `907150477` est conservé en handoff sur la connexion développeur Clover. La page App Settings visible avant redirection conserve les permissions, leurs 11 raisons, REST et Hosted iFrame; cet affichage ne prouve pas une session valide.
- La documentation Clover confirme que `Submit App` ouvre la checklist, puis `Submit for Approval` soumet une fois les exigences remplies. Compte développeur approuvé, description fonctionnelle et vidéo réelle sont requis. La checklist propre à cette application n’a pas encore été consultée; ne pas déduire ses cases de la documentation.
- Préparation locale : description d’examen et plan de preuves dans `docs/engineering/CLOVER_CHAMPS_A_SAISIR.md`. Aucun lien vidéo inventé, aucune affirmation de validation marchande ou paiement opérationnel.
- Restent ouverts : logo (import manuel demandé après trois refus d’accès fichier), pays Canada gratuit (contrôles désactivés), type Web/REST, vérification webhook et marchand autorisé. Production et annonces restent suspendues jusqu’à validation réelle.

## Reprise logo et Canada — 9 octobre 2026

- Kael a confirmé l’accès aux fichiers **dans Comet**. Une nouvelle tentative via le sélecteur documenté reste refusée par l’extension (« Allow access to file URLs »). Aucun nouveau logo téléversé. Le skill navigateur demande d’arrêter ces tentatives répétées; import manuel du fichier `public/icon-512.png` demandé, formulaire Edit App Name and Icon conservé dans l’onglet de fiche Clover.
- Kael a confirmé **Clover gratuit au Canada, en brouillon**, sans changer l’abonnement Minerva Flow. Les boutons ADD TIER sont désactivés; le niveau FREE américain est lui aussi explicitement désactivé dans son contrôle visible. Clover affiche « Get approved for billing by adding your bank account ». Aucun pays/tarif modifié; pas de français disponible tant que l’abonnement de pays n’existe pas. Ne pas contourner les contrôles désactivés ni entreprendre une configuration bancaire au nom de Kael.
- Les permissions complètes, les 11 raisons, REST et Hosted iFrame enregistrés lors de la reprise précédente restent la dernière configuration confirmée. Application DRAFT; aucun paiement, publication ou déploiement.

## Configuration Clover enregistrée dans Comet — 9 octobre 2026, 22:33 UTC

- **Le contrôle navigateur fonctionne désormais.** Le fournisseur `2`, nommé génériquement Chrome par l’outil, correspond bien à Comet (onglets corroborés avec sa fenêtre native). Extension connectée, lecture et modifications Clover effectuées puis vérifiées. Les blocages historiques plus bas sont dépassés.
- Application `SZVPXRYKYH7ZG`, développeur `WDTXKSPKZS76G`, toujours **DRAFT**. Nom officiel enregistré : **Minerva Flow**. URL `https://www.minervaflow.app`, lancement `/api/oauth/clover`, réponse OAuth **Code** sauvegardés.
- **Permissions enregistrées après confirmation de Kael au moment de l’action** : lecture/écriture Customers, Inventory, Orders et Payments; lecture seule Employees et Merchant; Ecommerce. Les **11 justifications** non vides ont été vérifiées après sauvegarde. Un enregistrement groupé ne conservait que certains droits; les catégories restantes ont été enregistrées séparément et le récapitulatif final confirme la matrice complète.
- Ecommerce **Hosted iFrame** enregistré; protection reCAPTCHA cochée. Ce réglage prépare les champs de carte Clover; il ne rend pas le paiement opérationnel. Aucun paiement, débit ou remboursement effectué.
- Fiche anglaise enregistrée : description honnête avec paiements/export automatique indiqués en développement, accroche, trois bénéfices, catégories Items & Inventory / Reporting & Analytics et Quick Service Restaurant / Full Service Restaurant.
- Assistance enregistrée : `flow@minervaflow.app`, `+15144515232`, `https://www.minervaflow.app/app-support`. La route `/fr/support` mène à la connexion, donc elle n’est pas utilisée comme assistance publique. Conditions et confidentialité publiques vérifiées et enregistrées : `/legal/terms`, `/legal/privacy`. La page support affiche actuellement `support@minervaflow.app`; harmonisation des coordonnées et divulgations Clover à revoir avant publication.
- **À terminer** : logo bloqué par l’autorisation de fichiers de l’extension Comet (premier essai puis essai après réponse utilisateur toujours refusés; demande de vérification dans Comet en attente). La politique navigateur interdit l’ouverture de `chrome://extensions` par l’agent : aucune tentative de contournement. Le logo local inspecté est `public/icon-512.png`.
- Webhook : URL cible préparée; **un seul envoi de code de vérification**, le formulaire demande maintenant le code reçu côté serveur. URL/abonnements non enregistrés; ne pas prétendre que le webhook fonctionne. Le handler local renvoie le code sans mécanisme opérateur de récupération; résoudre cette étape avec un environnement provisionné, sans publier le code dans le handoff.
- Distribution : niveau existant **FREE**, États-Unis seulement, **0 USD/mois**. Français indisponible tant qu’un abonnement de pays n’existe pas. Confirmation demandée pour préparer un niveau gratuit canadien en brouillon; aucune tarification ni distribution canadienne modifiée dans cette reprise.
- Type toujours **Android & REST Clients**, terminaux Clover déclarés. Tentatives de désélection non conservées; aucun changement enregistré ni APK natif client téléversé sur Clover. L’intégration attendue est Web/REST; revoir ce paramètre sans prétendre compatible avec les terminaux.
- Candidat qualité `8531117551d1ed27a528b2e523055d20e957220e`, branche `fix/release-quality-2.52.0`, **poussé**. [CI distante](https://github.com/Endsi3g/Minerva-Flow/actions/runs/37991213846) terminée **avec succès**, y compris lint bloquant, TypeScript, tests et build. Les 592 tests locaux restent documentés ci-dessous.
- **NOT READY Production / soumission Clover** : autorisation marchand, secrets serveur, renouvellement durable, fiches clients, paiement réel et parcours restent à terminer. Aucun email, migration Production, promotion Production ou soumission effectué.
- Preuve privée sans secret : `.verify-artifacts/20261009T223300Z-clover-browser-setup/saved-configuration.json`. État structuré : `docs/engineering/clover-production-setup.json`. Les captures outil ne certifient pas à elles seules le paiement ou l’installation marchande.

## Reprise qualité et configuration navigateur — 9 octobre 2026

- Le candidat isolé sur `fix/release-quality-2.52.0`, basé sur `aad3957` (`v2.52.0-rc.2`), passe maintenant **ESLint global : 0 erreur, 0 avertissement** avec `--max-warnings=0`. La CI est rendue bloquante; son ancien `continue-on-error` est supprimé.
- Les corrections existantes du workspace ont été reprises après revue, avec leurs dépendances ciblées. Les changements fonctionnels OTP/onboarding de `LoyaltyJoinFlow` et les autres travaux natifs ne sont pas copiés dans ce lot. Les artefacts générés et exemples `.design-sync` sont exclus du parcours ESLint; les règles du code applicatif restent actives.
- Les liens OAuth utilisent `FullPageLink` : pas de préchargement, navigation document complète, URL réelle conservée pour clavier et nouvel onglet. Les correspondances POS conservent les relations PostgREST objet ou tableau. Les erreurs de nombre de fichiers sont recalculées pour le vrai fichier importé, en conservant les méthodes `File`.
- La recherche se réinitialise à la fermeture et ignore les réponses périmées; les chargements employés et catalogue sont protégés contre les résultats d’une ancienne sélection. Les préférences navigateur utilisent un abonnement externe et restent utilisables si le stockage est refusé ou saturé. La sélection locale d’un agent ne doit pas être écrasée par une prop inchangée.
- Tests ciblés : **18/18**. Suite complète finale : **592/592, 93 fichiers**. TypeScript ciblé final passe. Le build Webpack final passe (**308 pages**, exit 0, heap Node 4 Go). Les parcours du nouveau Preview restent à valider; un lint vert seul ne valide pas Production.
- Diagnostic navigateur réel : Chrome est installé et ouvert; plugins locaux activés et manifeste natif valide. **L’extension ChatGPT attendue n’est pas installée/enabled dans le profil Chrome actif**, d’après le diagnostic officiel du plugin. Le navigateur intégré et le fournisseur `chrome` renvoient indisponible; l’inventaire des navigateurs est vide.
- Action utilisateur requise : installer l’extension officielle depuis [Chrome Web Store](https://chromewebstore.google.com/detail/chatgpt/hehggadaopoacecdllhhajmbjkdcmajg), vérifier « Manage » dans les réglages Computer Use, sélectionner `@Chrome` et autoriser Clover. Le skill navigateur interdit de forcer la réparation de l’hôte natif ou d’utiliser un mécanisme alternatif pour écrire dans le site. L’application Codex ne peut pas être pilotée par l’agent; sa fenêtre était explicitement refusée.
- Safari a de nouveau confirmé le développeur Clover : application **DRAFT**, type **Android & Web**, URL/permissions/webhooks/icône/liens légaux/captures incomplets, tarification indiquée complète. Chrome affiche un tableau de bord « Test Merchant », qui ne prouve pas l’activation Sandbox/Ecommerce de l’intégration. **Aucun champ Clover enregistré par l’agent.** Composio confirme toujours aucune connexion Clover active.
- Textes, URLs et raisons prêts : [champs Clover](docs/engineering/CLOVER_CHAMPS_A_SAISIR.md). Corriger le type vers Web seulement si Clover le permet sans recréation/destruction, vérifier les prix déjà saisis, et ne pas présenter les paiements/clients futurs comme validés pour la soumission.
- **NOT READY Production** : autorisation marchande, renouvellement durable/stockage atomique, fiches clients et paiements réels restent ouverts, puis validation des parcours. Aucun email ni promotion Production ni soumission store.
- Preuves privées : `.verify-artifacts/20261009T210211Z-release-quality/`. Le premier essai des nouveaux tests échouait dans leur environnement de stockage Node 26; le harness corrigé conserve les mêmes assertions. Un typecheck simultané au build a rencontré des fichiers `.next/types` régénérés : résultat invalide conservé, puis contrôle séquentiel effectué après compilation. Aucun secret publié.

## Correctif confirmé — 2.52.0-rc.2 (9 octobre 2026)

- Commit `aad39578f70dbfbcbee3ec4453d50e42837ae2dc`, branche `release/clover-2.52.0-rc.2` et tag annoté `v2.52.0-rc.2`, poussés et vérifiés. [Préversion publiée](https://github.com/Endsi3g/Minerva-Flow/releases/tag/v2.52.0-rc.2). Le tag rc.1 reste inchangé.
- Les 8 assertions d’adresse obsolètes sont corrigées selon l’adresse confirmée « Lberge », déjà utilisée par les templates. **574/574 tests unitaires dans 91 fichiers**, dont les 25 tests des deux fichiers anciennement défaillants et quatre nouveaux contrôles d’annonce. TypeScript, lint des six fichiers modifiés et build Webpack (308 pages) passent sur le candidat isolé.
- **Lint global du candidat : 201 erreurs et 216 avertissements**, contre 204 et 217 dans la CI de rc.1. Les fichiers corrigés n’ont aucun diagnostic. La CI contient toujours `continue-on-error: true` pour ce lint; une éventuelle CI réussie ne signifie pas que le lint global est vert.
- Le webhook de release demande `emailOnly: true` et remonte un échec de campagne via HTTP 502; aucun push ni notification dans l’app en mode courriel seul. Si une entrée a été créée mais que l’envoi est incertain, contrôler le fournisseur avant toute reprise; ne pas recréer aveuglément une entrée ou campagne.
- Kael a confirmé **l’annonce après validation et déploiement Production seulement**. Aucun envoi pour rc.2 : [workflow d’annonce](https://github.com/Endsi3g/Minerva-Flow/actions/runs/37987038511) ignoré conformément au garde de préversion.
- [CI du correctif](https://github.com/Endsi3g/Minerva-Flow/actions/runs/37986883044) : **terminée avec succès**, tests et build réussis. Le lint global reste non bloquant et en échec; ce succès ne rend pas le produit prêt pour Production. Preview du commit exact `aad3957` : déployé; le webhook refuse la requête sans autorisation avec HTTP 401 (`Non autorisé`), sans création ni annonce.
- Safari consulté réellement via computer-use : tableau de bord développeur Clover, application DRAFT, type « Android & Web » (type Web attendu pour l’intégration serveur). Étapes URL, permissions, webhooks, icône, liens légaux et captures marquées incomplètes; tarification marquée complète. Aucun champ enregistré par l’agent. L’inventaire est vide côté navigateurs contrôlables; le skill computer-use exige un navigateur connecté pour modifier ce site. Attente de Chrome connecté ou saisie manuelle dans Safari.
- [Notes de vérification rc.2](docs/releases/RELEASE_2.52.0-rc.2.md). Preuves privées : `.verify-artifacts/20261009T201455Z-email-baseline-fix/`. Le code livré se trouve dans `/tmp/minerva-clover-release-20261009`; le workspace original garde ses autres changements.
- **NOT READY pour Production** : dette lint globale, marchand Clover, stockage/refresh des jetons, paiement et fiches clients puis parcours réels à compléter. Aucun déploiement Production ou binaire téléversé par cette livraison.

## Livraison GitHub confirmée — 2.52.0-rc.1 (9 octobre 2026)

- Périmètre confirmé : **lot Clover testé + handoff**. Commit `a48e06c8a41bf43480b56cc6cc3de263026724c8`, branche `release/clover-2.52.0-rc.1` et tag annoté `v2.52.0-rc.1`, poussés et relus sur GitHub.
- [Préversion publiée](https://github.com/Endsi3g/Minerva-Flow/releases/tag/v2.52.0-rc.1), package et lockfile `2.52.0-rc.1` dans le candidat. Les nombreuses autres modifications web/natives sont conservées dans ce workspace; `main` reste au commit `3f92fd3`.
- Le candidat est isolé dans `/tmp/minerva-clover-release-20261009`. Son arbre Git est propre après commit. Le [handoff livré avec le tag](https://github.com/Endsi3g/Minerva-Flow/blob/v2.52.0-rc.1/HANDOFF.md) contient les cinq étapes d’implémentation et les conditions d’activation.
- Vérification isolée : **150/150 tests Clover**, TypeScript et ESLint des 32 sources sélectionnées passent. **Build Webpack réussi, 308 pages**, après relance avec heap Node de 4 Go; le premier arrêt mémoire SIGABRT est conservé.
- Suite complète : **562 réussites / 8 échecs**, dans 91 fichiers. Les mêmes 8 assertions d’adresse postale des templates email échouent sur la base inchangée `3f92fd3`; elles restent hors du lot Clover. La suite complète n’est pas verte.
- [Workflow d’annonce vérifié](https://github.com/Endsi3g/Minerva-Flow/actions/runs/37973844395) : job `announce` **skipped**, aucune étape exécutée. La publication de cette préversion n’a déclenché aucun email ou webhook Production via ce workflow.
- CI distante au dernier relevé : [en cours](https://github.com/Endsi3g/Minerva-Flow/actions/runs/37973809918); les résultats locaux ne certifient pas son résultat final.
- **NOT READY pour Production et les stores** : autoriser un marchand Sandbox, achever renouvellement/stockage atomique, paiement préautorisation-capture-remboursement et fiches clients, puis valider les vrais parcours. Export/annulation restent désactivés tant que les contrôles réels ne sont pas satisfaits.
- [Notes et contrôles de la préversion](docs/releases/RELEASE_2.52.0-rc.1.md). Preuves privées : `.verify-artifacts/20261009T182000Z-clover-release/` (tests, comparaison de base, build et métadonnées GitHub). Aucun déploiement Production, migration Production ni téléversement de binaire effectué par cette livraison.

## Reprise prioritaire — 2026-10-09 : terminer Clover, commandes, paiement et clients

**État de référence actuel : NOT READY.** Les statuts historiques « prêt en production » plus bas ne certifient pas cette intégration. Aucun paiement Clover n’est implémenté ou activé. Aucun nouveau déploiement Preview/Production ni email d’annonce n’a été effectué pour ces travaux. Préserver les nombreuses modifications existantes du dépôt.

### Contrat confirmé par Kael

- Application Clover publique pour les restaurateurs Minerva Flow; configuration de la fiche en premier, saisie manuelle dans Safari.
- Export d’une commande après acceptation par un propriétaire ou gestionnaire actif du restaurant. Les commandes refusées avant acceptation ne sont pas exportées. Les accès clients restent séparés de la gestion.
- Paiement en ligne demandé : préautorisation à la commande, **capture après acceptation**. Refus avant capture : libérer la préautorisation; refus après capture : remboursement intégral automatique. Le paiement à la réception reste le seul mode actuellement configuré.
- Conserver les identifiants, articles, formats, notes et montants serveur; association durable et unique restaurant/marchand/environnement/commande/paiement. Pas de double débit, commande, crédit de fidélité ou comptage de ventes.
- Attribution aux employés Clover en lecture seulement; synchronisation automatique des annulations à valider, sans supprimer une commande payée pour prétendre la rembourser.
- Justifications Customers Read/Write préparées. La création/mise à jour des fiches clients liées aux commandes est un chantier restant; aucune carte enregistrée pour des achats futurs n’est impliquée.

### Déjà réalisé avant cette reprise

- Queue `clover_order_exports`, intentions d’envoi persistées, leases/CAS, mappings de produits/formats/modificateurs, comparaison des montants/taxes, recherche d’une transmission incertaine et exclusion des exports lors de l’import de ventes.
- Configuration web propriétaire, états de transmission et attribution employés. Export/annulation bloqués par les drapeaux de validation réelle; aucun planificateur du nouveau worker n’est enregistré.
- Migrations `0181` et `0182` appliquées et consignées **en Staging seulement**; 0 restaurant activé, 0 job, 0 fixture restante au dernier contrôle. L’essai initial de rollback a conservé le DDL à cause d’un COMMIT intermédiaire : incident découvert, documenté et corrigé; ne pas prétendre que tout le DDL avait été annulé.
- Dernière vérification de ce lot : 537 tests unitaires / 94 fichiers, TypeScript, ESLint ciblé et build passent. Ce résultat ne prouve aucun paiement, écran Clover ou nouveau déploiement réel.

### Plan d’implémentation et critères de fin

1. **Connexion existante — premier lot terminé localement, non déployé.** Hôte API `/oauth/v2/token` corrigé et autorisation Production sur `www.clover.com`; repli GET avec secret supprimé; appels bornés, sans cache ni suivi de redirection; réponses et expirations validées; jetons expirés refusés même avec refresh token présent. Le callback lie l’état signé au compte initiateur, au restaurant, au fournisseur et à l’environnement, revalide les droits actifs avant stockage et confirme l’identifiant marchand. Les échecs Vault/DB empêchent un faux succès, y compris dans la connexion manuelle. Le stockage des deux secrets et de la ligne reste non atomique : prévoir transaction/gestion des secrets orphelins avant la rotation des jetons.
2. **Provision et renouvellement — restant.** Kael n’a pas encore le marchand connecté et termine d’abord l’application Clover. Autoriser un marchand Sandbox avec Ecommerce, configurer les vrais secrets serveur, terminer le renouvellement des jetons avec coordination durable entre processus, rotation et gestion d’une réponse perdue. Pas de refresh concurrent non protégé ni retour d’un jeton expiré.
3. **Paiement — restant, dépend de 2.** Valider d’abord un seul identifiant de commande Clover pour le parcours demandé : `/v1/charges` avec `capture=false` crée une commande; le schéma documenté de `/v1/orders/{orderId}/pay` n’expose pas `capture`. Ne pas créer une seconde commande atomique après la préautorisation. Implémenter tokenisation Clover hébergée, montant serveur, références et intentions financières persistées, capture après acceptation, libération/remboursement au refus, état incertain et rapprochement avant reprise. Le worker actuel refuse les paiements en ligne : adapter ce contrat après validation du flux réel, sans contourner le garde existant.
4. **Customers Read/Write — restant.** Définir l’association durable restaurant/marchand/environnement/client Minerva/client Clover; créer ou mettre à jour seulement les coordonnées nécessaires d’une commande acceptée, éviter les fiches en double et les écritures aveugles après réponse perdue. Séparer le consentement promotionnel. Write customers n’est pas requis pour la seule préautorisation/capture; ne pas justifier de cartes enregistrées ou d’import global par ce chantier.
5. **Validation et livraison — restant.** Tests Sandbox acceptation/refus/capture/remboursement, expiration, concurrence, double clic et réponse réseau perdue; une seule commande et un seul règlement dans Orders/Register; import sans double fidélité/CA. Vérifier les parcours web/iOS/Android puis les audits de conformité avant sortie native. Déployer Preview, vérifier les preuves, et promouvoir seulement après les contrôles requis. Enregistrer le planificateur et renouveler les autorisations marchands si les permissions ont changé.

### Blocages et preuves

- À 15:34 UTC le 9 octobre : **0 connexion Clover en Staging et Production**, connexion Composio absente. Contrôles en lecture seule; aucun secret Vault récupéré. Le skill Vercel Marketplace impose l’autorisation réelle du marchand avant l’implémentation du nouveau paiement; aucun checkout factice ne doit remplacer cette étape.
- Permissions demandées : Read/Write payments + Online payments pour la capture; Read customers selon les endpoints de paiement/remboursement; Write customers seulement pour la synchronisation effective des fiches. Justifications françaises/anglaises : [champs Clover à saisir](docs/engineering/CLOVER_CHAMPS_A_SAISIR.md).
- [État du paiement](docs/releases/CLOVER_PAYMENT_READINESS_2026-10-09.md), [validation de l’export](docs/releases/CLOVER_ORDER_EXPORT_VALIDATION_2026-10-09.md), [configuration sans secrets](docs/engineering/clover-production-setup.json).
- Vérification locale du premier lot de connexion à 15:49 UTC : **77/77 tests ciblés**, **605/605 tests unitaires dans 98 fichiers**, TypeScript et ESLint des 11 fichiers concernés passent. [Rapport de ce lot](docs/releases/CLOVER_OAUTH_FOUNDATION_2026-10-09.md). Build et parcours réels non relancés pour ce lot; le précédent build ne prouve pas ces nouveaux changements. Aucun appel financier ni nouvelle migration distante.
- Preuves privées : `.verify-artifacts/20261009T153400Z-clover-payment/` et `.verify-artifacts/20261008T204459Z/`. Ne jamais recopier de secrets, jetons, coordonnées clients ou identifiants d’examen dans ce handoff.

> **Base historique** : 2.36.0 — clôture de sprint du 15 septembre 2026.
> **État produit actualisé** : 26 septembre 2026. Les sections historiques plus bas décrivent leur date de session et ne remplacent pas le [guide produit propriétaire et client](docs/product/PRODUCT_GUIDE_OWNER_CLIENT.md), ni les rapports de vérification les plus récents.

## Reprise — 2026-10-03 (branche `feat/team-portal-and-native-account-uplift`)

- **Contenu** : portail `/equipe` (web + iOS), refonte du Compte client iOS, sous-pages Réglages web, NFC (lecture + programmation), carte Mains Magique, journalisation `AppLog`. Rien n’est publié; aucun commit n’avait été fait avant cette reprise.
- **Vérifié** : `tsc` 0 erreur; 5 tests `NFCTagURLTests` passent; build iOS simulateur. **Non vérifié** : rendu visuel au simulateur de ces phases, parcours `/equipe` de bout en bout (les clés locales Supabase renvoient 401, voir mémoire), NFC sur appareil réel.
- **Bloquant avant archive/installation** : aucun profil de signature installé n’inclut `com.apple.developer.nfc.readersession.formats`. Procédure : `docs/mobile/NFC_AND_SIGNING.md`.
- **Audit App Store** (`app-store-compliance-guard.sh native/ios`, 2026-10-03) : 0 critique, 0 élevé, 3 moyens (polices à taille fixe, Réduire les animations, questionnaire d’âge 2026). Les trois alertes précédentes étaient des détections textuelles; corrigées en retirant le mot « Stripe » de l’UI native (paiement et versements ouvrent le web), en nommant `Config.privacyPolicyURL` et en centralisant le contact support (`SupportContact`, plus de `mailto:` en dur). La suppression de compte native existait déjà (`DeleteAccountSheet`). Cet audit n’est pas une soumission : les 3 avertissements moyens restent à traiter.
- **Base de données** : migrations `0168`–`0171` consignées (renumérotées), `is_demo` posé sur « Minerva Flow » et le « Mon restaurant » du fondateur, compte démo `dev-test@minervaflow.app` rattaché à 11 restaurants démo. Voir `supabase/migrations/README.md`.
- **Changelog par audience** : migration `0172` appliquée (colonne `audience`, défaut `owner`). Aucune entrée client n’est publiée : la rédiger et la publier fait partie de l’étape de sortie, après vérification du build déployé. Les écrans iOS (client : `ClientUpdatesView`; propriétaire : `NativeChangelogView(audience: "owner")`) affichent un état vide propre en attendant.
- **Installation sur téléphone** : build de test installé sur l’iPhone « YourBel » sans l’entitlement NFC (le profil de développement ne l’inclut pas), le fichier du dépôt est inchangé. Le NFC ne fonctionne pas dans cette installation.
- **Hors commit, à revoir** (autre session, SEO/blog) : titres des 15 pages `(app)` remplacés par du français en dur (perte de la traduction `breadcrumb` en EN/TR) sur des pages `noindex`; `0167_blog_posts.sql` non appliquée; `lib/blog`, `feed.xml`, `robots`, `sitemap`, `llms*.txt` non commités.
- **Partage de résultats (phase 18)** : `/campaigns/resultats` (propriétaires) et `/equipe/partager` (équipe). Rendu et vidéo vérifiés dans Chromium; pages non testées avec un compte réel. Détails : `docs/engineering/SHARE_RESULTS.md`.
- **À décider** : offres Mains Magique (conseils fournis, rien créé), clés PostHog et GitHub optionnelles, contenu du GTM (chiffres non mesurés), commission « récurrente » vs première facture.

## Vérification de reprise — 2026-09-26

### Mise à jour native — build TestFlight 13

- Archive signée `1.0.0 (13)` pour `com.minervaflow.loyalty`, équipe `NHMPLN46TN`; version marketing `1.0.0` cohérente dans l’app et le widget. Archive locale : `~/Library/Developer/Xcode/Archives/2026-09-25/MinervaFlow 1.0.0 (13).xcarchive`.
- Vérifications : archive Xcode réussie; build `13` et version `1.0.0` confirmés dans les métadonnées; signature valide; UUID du dSYM Sentry identique au framework (`F8157D84-7D82-3EFF-824A-FA39DEFEA828`); `git diff --check` passe.
- Téléversement App Store Connect confirmé par Xcode le 2026-09-25 à 21:02, état **Uploaded** : **MinervaFlow 1.0.0 (13) uploaded**. Le traitement Apple, l’affectation aux groupes et la disponibilité TestFlight ne sont pas confirmés; ne pas annoncer le build comme installable.
- Hook App Store : 0 critique, 0 élevé, 2 avertissements. Avertissements maintenus : `ITSAppUsesNonExemptEncryption` absent de l’Info.plist du widget (déclaration de build à vérifier) et contrôles manuels App Store. XCTest ne produit toujours aucun résultat confirmé. Les warnings Swift de compilation restent à corriger/évaluer.
- Le numéro de build `13` est enregistré dans `native/ios/project.yml` et le projet Xcode. Commit `5834430` poussé sur `release/2.48.0`.
- Commit `3521ec4` poussé sur `release/2.48.0`; Preview `dpl_3q8gfDazP8Uk7qfU9mqrGgD2gE4M` READY. Build Production exact du commit `3521ec4`: `dpl_ENHPeX99EKXdWoTH2WtPHfYAhcR9` READY, domaines `https://www.minervaflow.app` et `https://minervaflow.app` rattachés. La release GitHub et le courriel utilisateurs n’ont pas été publiés.

### Demande de promotion web et statut Apple — 2026-09-25

- **Web Production déployé avec Stripe Connect explicitement indisponible.** Carte Paramètres : « Non configuré — bientôt disponible », activation désactivée. Les paiements en ligne ne sont exposés que si la clé plateforme et les capacités du compte restaurant sont actives; les devis payables sont aussi refusés côté serveur sans cette configuration. Il n’y a pas de `STRIPE_SECRET_KEY` live dans Vercel Production et le destinataire de test reste `restricted`; aucun paiement Connect n’est déclaré fonctionnel. Les tests POS sont reportés comme demandé.
- **TestFlight :** le build 13 est maintenant téléversé; Xcode confirme seulement `Uploaded`, pas son traitement Apple ni son affectation à un groupe. Le build `1.0 (11)` reste le dernier confirmé pour les groupes interne/externe (8 testeurs). À vérifier dans App Store Connect dès qu’une session connectée est disponible; ne pas annoncer le 13 comme disponible avant confirmation.
- **Vérification web production :** routes `/login` et `/en/login` répondent 200 sur le domaine canonique; `minervaflow.app` redirige vers `www.minervaflow.app`. Les erreurs runtime Vercel étaient à 0 dans les 15 premières minutes. Le parcours Intégrations authentifié n’a pas été inspecté dans le navigateur de l’utilisateur; aucune session Browser connectée n’était disponible. XCTest n’a aucun résultat confirmé; l’audit App Store statique reste à 0 critique/0 élevé et 2 avertissements (déclaration chiffrement widget à confirmer; contrôles manuels App Store).
- App Store Connect reste inaccessible depuis la session navigateur liée (aucun navigateur connecté découvert). Organizer confirme `Uploaded` pour le build 13; son traitement Apple et son affectation aux groupes restent **non vérifiés**.
- Carte web Stripe Connect clarifiée (`Non configuré — bientôt disponible`, action désactivée). Garde serveur ajouté : absence de clé plateforme ou de capacités actives masque/refuse le paiement en ligne, y compris l’émission d’acomptes de devis. Cette modification est destinée à préserver les parcours hors-ligne pendant que Stripe est configuré; tests POS reportés.

### Reprise des blocages — état confirmé après changement concurrent

- L’écran `/en/login` a été corrigé : toutes les chaînes Auth et le panneau de présentation utilisent maintenant les messages anglais; `/fr/login` conserve les messages français. Playwright/Chromium cache 1.63 a vérifié les deux tailles (1440×900 et 390×844), sans erreur JavaScript ni débordement. Captures : `docs/screenshots/auth/auth-login-en-2026-09-25-desktop.png` et `...-mobile.png`.
- La suite Vitest complète passe à nouveau : 335/335 tests, 58 fichiers; `npx tsc --noEmit` et ESLint ciblé passent. Deux assertions préexistantes ont été adaptées à `price_option_id: null` pour les lignes sans option tarifaire.
- POS/Connect ciblés : 40/40 tests unitaires passent. Ils couvrent les adaptateurs/mappings, mais pas une transaction POS réelle. Le staging n’a aucune connexion Connect Stripe enregistrée; `.env.test.local` ne contient pas de secrets sandbox Square/Clover/Toast, donc le paiement Connect et les E2E POS réels restent impossibles à confirmer. Les secrets fournisseur de `.env.local` n’ont pas été utilisés.
- Schéma vérifié : production a `menu_items.price_options` (0151, journal `20260925184354`) et les quatre colonnes 0150. Migration `0150_restaurant_connect_v2` appliquée en production, journal `20260925191042`; vérification PostgREST réussie et 106 restaurants ont les valeurs par défaut compatibles (`v1`, `unrequested`, `0`). Sur le staging autorisé, les colonnes 0150 existent, tandis que `menu_items.price_options` est encore absente.
- La production applicative n’a pas été promue. Restent : activer un destinataire Stripe test avec capacités de transfert/payout, obtenir les identifiants sandbox POS et rétablir/réussir l’E2E authentifié staging.

### Prochaines sorties demandées

- [x] Web : code candidat poussé au commit `1a63de8`; Preview exact `dpl_Hg2V8PaycRn86dVFCJWCfJbMtkqF` `READY` et journal de build aligné sur ce SHA. La correction `/en/login` est maintenant vérifiée sur ce Preview. Production reste sur `dpl_A35dLpmKawVPfxhp9rWEWSiVcRLc` (`f969e15`).
- [x] Chromium : cause trouvée — les dépendances attendent des builds Playwright différents de ceux installés dans le cache. Chromium headless existant, version Playwright 1.63, fonctionne avec un override temporaire. Le navigateur n’a pas été téléchargé ni la configuration permanente du projet modifiée.
- [ ] E2E staging : 3 parcours retentés dans une worktree propre avec données synthétiques et staging `lhosxxtvgmedwarwgjhb`; 0/3 réussis. Les parcours n’atteignent pas l’état attendu : navigation `/workspace`/`/login` expire et le worker Chromium n’arrive pas à démarrer dans le délai. Traces Playwright ignorées localement sous `test-results/`; reprendre après réparation du serveur de test/runtime.
- [x] iOS : archiver et téléverser `1.0.0 (13)` à App Store Connect; version de l’app/widget, signature et dSYM vérifiés. [ ] Confirmer le traitement Apple, l’affectation au groupe externe et la disponibilité pour testeurs; relancer XCTest sur un runner stable.
- [ ] Après validation des deux sorties : publier les notes/changelog et décider de l’envoi du courriel aux utilisateurs consentants; aucune release ni notification n’est encore émise.

- **Diagnostic build — 2026-09-25** : `npx tsc --noEmit`, ESLint ciblé sur `next.config.ts` et `git diff --check` passent. `npx next build --webpack --debug` a pris 71 s pour compiler, 13 s pour TypeScript, a généré les 328 routes et s’est terminé avec le code 0; Next a signalé l’usage dynamique de `cookies` sur des routes privées, qui sont rendues dynamiquement. Aucun téléversement Sentry n’a été tenté localement. L’étape précédemment décrite comme bloquée était surtout une longue compilation silencieuse.

- **Mise à jour Sentry Vercel** : les variables Sentry obsolètes ont été retirées; `NEXT_PUBLIC_MINERVA_SENTRY_DSN` est configurée pour les trois environnements. La build Preview a confirmé le téléversement des source maps et la création de la release `20197a4c85f3aed215c6cd12ce69004b9ab70a4b` dans `minerva-s5m/minerva-flow-web`. Le jeton transmis dans le chat doit être tourné après validation. La ressource Marketplace existe toujours sans projet lié.

- **Candidate web `2.48.0`** : commit `1a63de8` inclut les formats tarifés (`6621c38`), le changelog illustré (`ef4c04c`) et la correction des traductions Auth. Preview exact `dpl_Hg2V8PaycRn86dVFCJWCfJbMtkqF`, `READY`, confirmé par journal de build pour ce SHA. Smoke Auth et images du changelog 200; `/en/login` anglais vérifié avec Chromium desktop/mobile, sans overflow ni erreur JavaScript. Production actuelle : `dpl_A35dLpmKawVPfxhp9rWEWSiVcRLc`, branche `main`, commit `f969e15`.
- Vérification fonctionnelle staging : 335 tests unitaires (58 fichiers), lint ciblé; `tsc --noEmit` est actuellement bloqué par un fichier de types Next généré tronqué sous `.next/dev/types/validator.ts`. Les E2E précédents (6/6), la reprise précommande/traiteur (2/2) et l’E2E Intégrations owner (1/1) passent avec le garde de rôle final. Une première reprise a échoué avant authentification; la suivante a réussi en 41,5 s. Vérification Supabase après nettoyage : le restaurant fixture et l’utilisateur synthétique sont absents.
- Reprise ciblée Playwright après configuration du bac à sable Stripe : 2/2 scénarios précommande/production traiteur réussis. Nouveau flux Accounts v2 Recipient implémenté pour les restaurants; les comptes Express v1 historiques restent inchangés. Migration additive 0150 appliquée au staging via DDL ciblé et ses quatre colonnes vérifiées. Smoke test API test-mode (création V2, lien hébergé, lecture d’état) réussi et compte synthétique fermé. Aucun destinataire test n’est encore activé : Checkout/PaymentIntent complet demeure non validé, le test antérieur ayant échoué avec `insufficient_capabilities_for_transfer`. Le navigateur E2E reste limité à une clé publiable `pk_test_` dédiée ou aucune clé.
- Inspection visuelle du reçu de précommande à 390 px : modale lisible, action de fermeture visible, aucun débordement horizontal. Captures conservées dans `docs/screenshots/`.
- Archive native `1.0.0 (12)` téléversée à App Store Connect; traitement Apple et disponibilité TestFlight non confirmés. Le build `1.0 (11)` demeure le dernier build confirmé dans les groupes. XCTest actuel ne fournit aucun résultat confirmé, le runner Xcode se bloque.
- Audit App Store actuel : 0 critique, 0 élevé, 2 avertissements (clé de chiffrement à confirmer côté widget; contrôles manuels métadonnées/confidentialité/review encore ouverts).
- **Production : NOT READY — aucune promotion, tag, release GitHub ni courriel utilisateur.** Les quatre champs de migration 0150 sont appliqués et vérifiés (journal `20260925191042`); `menu_items.price_options` est aussi lisible (0151, journal `20260925184354`). L’historique distant diverge du dépôt; ne pas lancer `supabase db push`. Les 21 brouillons Mains Magique restent inactifs; Magie Djonjon et Magie Don Pollo ont leurs choix 3/6/9 et leurs prix configurés, en attente de validation propriétaire. Le paiement Stripe Connect reste non validé; POS E2E incomplet et le dernier staging E2E échoue avant assertion métier.
- **Changelog in-app** : notes « Précommandes et devis traiteur » ajoutées au fallback in-app avec captures desktop/mobile dans `public/assets/changelog/`; elles sont visibles avec le déploiement de cette candidate mais aucune entrée DB/release/notification n’a été publiée. Les assets probants sont aussi dans `docs/screenshots/`.
- Le configurateur de formats tarifés pour les propriétaires et la sélection correspondante dans le panier client sont intégrés au code web/iOS au commit `6621c38` et consignés au changelog. La migration 0151 est appliquée en production; le code reste sur la candidate Preview. Les deux articles Magie sont configurés mais restent des brouillons inactifs jusqu’à validation de la propriétaire.
- **Sentry — 2026-09-25** : le code web envoie vers `minerva-s5m/minerva-flow-web`; iOS envoie vers `minerva-flow-ios`. Un événement web synthétique sans données personnelles est confirmé; le DSN iOS compile, mais sa réception native reste à vérifier. PII, en-têtes, cookies, corps, paramètres d’URL, données DB, journaux Sentry et Replay sont désactivés; traces à 10 % en production. Le Preview `20197a4` a téléversé les source maps et créé sa release Sentry. La ressource Marketplace `sentry-copper-notebook` (forfait Developer gratuit) existe, mais sa liaison à `minerva-flow` n’a pas fini; ne pas relancer `integration add`. Les alertes projet créées via MCP n’ont pas pu être relues; leur état reste à confirmer dans Sentry. Le jeton transmis dans la conversation doit être tourné.

- L’alerte reçue (« The destination stream closed early. », requête `/en/overview`) correspond à la fermeture d’un flux de rendu RSC; le courriel ne contenait ni frame d’erreur métier ni frame Supabase. Le signal continue d’être capturé dans Sentry, mais `lib/alerts/error-notifier.ts` classe désormais cette seule erreur transport exacte comme non critique pour éviter une alerte email trompeuse. Les erreurs différentes restent alertables.
- Le checkout natif s’ouvre immédiatement après un ajout depuis le Menu; le code Scanner a été remis en page avec QR/code temporaire, expiration, reprise d’erreur et accès caméra.
- Validation locale : Vitest 321/321, `tsc --noEmit` et lint ciblé passent. Sur iPhone 17 Pro Simulator, les 2 tests UI ciblés de navigation panier et Scanner passent. La première tentative de tests UI a échoué à cause de sélecteurs de test/accessibilité; ces sélecteurs ont été corrigés et la reprise passe.
- App Store Connect : compte démo vérifié et renseigné, notes de review et consignes de test enregistrées; politique de confidentialité renseignée. Le build `1.0 (11)` est le dernier build confirmé « En cours de test » dans les groupes interne et externe (8 testeurs); lien public : https://testflight.apple.com/join/xGr45uuF. Le build `1.0.0 (12)` a été téléversé le 2026-09-25; son traitement et son affectation aux groupes restent à confirmer. Les vérifications manuelles (déclarations de confidentialité, captures et accords) restent ouvertes avant publication publique.
- dSYM Sentry de l’archive `1.0.0 (12)` : UUID du framework et du DWARF dSYM vérifiés identiques (`FCE41180-E8B0-3AA6-992D-BE9863D30A88`); le build `1.0 (11)` avait aussi été corrigé précédemment.
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
| **Clover POS** | **NOT READY — mise à jour du 9 octobre 2026** | Code de synchronisation et d’export local; aucun marchand relié, aucun paiement validé. Voir la reprise prioritaire en tête de ce document. |
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

Voir [`docs/mobile/MOBILE_APP_AUDIT_AND_ROADMAP.md`](docs/mobile/MOBILE_APP_AUDIT_AND_ROADMAP.md) pour les contrôles requis avant diffusion.

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
