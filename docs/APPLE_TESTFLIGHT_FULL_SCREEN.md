# Minerva Flow — Apple Developer, App Store Connect et TestFlight

> Ouvrez ce document dans l’aperçu Markdown de l’éditeur, puis utilisez le
> mode plein écran. Il sert de tableau de bord unique jusqu’au premier build
> TestFlight. Les secrets, mots de passe, codes 2FA et clés `.p8` ne doivent
> jamais être collés ici ni envoyés dans une conversation.

## État de départ confirmé

| Élément | Valeur / état |
|---|---|
| Produit | Minerva Flow |
| Bundle ID iOS | `com.minervaflow.loyalty` |
| Apple Developer Team actuel | `NHMPLN46TN` |
| Équipe inscrite dans le projet | À aligner : l’ancien identifiant ne correspond pas à l’équipe Apple connectée |
| Compte Apple Developer | Actif, renouvellement le 16 septembre 2027 |
| Cible minimale | iOS 17 |
| Langue initiale des captures | Anglais |
| Support | `theminervabrand@gmail.com` |
| Paiement de commandes | Autorisé hors achat intégré : biens/services physiques |
| Abonnement logiciel propriétaire | Réalisé sur ordinateur, sans IAP ni lien d’achat dans l’app iOS |
| Notifications client | E-mail transactionnel + push web + APNs iOS ; jamais SMS |
| Cartographie | MapKit dans l’app ; aucun SDK Google Maps embarqué |

## Règles de sécurité avant de commencer

- [ ] Ne jamais partager mot de passe Apple, code de validation à deux facteurs, certificat, profil de provisionnement ni clé APNs `.p8`.
- [ ] Créer la clé APNs uniquement lorsque l’app demande une confirmation juste avant le bouton **Generate**.
- [ ] Télécharger la clé `.p8` une seule fois, puis la stocker comme secret de déploiement. Ne pas la déposer dans Git, dans `native/ios/`, ni dans une variable publique `NEXT_PUBLIC_*`.
- [ ] Garder deux comptes de test isolés : un propriétaire/gestionnaire et un client. Ils ne doivent pas être des comptes de production réels.
- [ ] Vérifier l’identité de l’équipe Apple avant toute signature : `NHMPLN46TN` est celle affichée dans Apple Developer le 17 septembre 2026.

## Phase 1 — Identifiant, capacité Push et signature

### 1. Aligner l’équipe de signature

- [ ] Dans le projet Xcode, définir `DEVELOPMENT_TEAM = NHMPLN46TN` pour l’app, le widget et les cibles de test.
- [ ] Régénérer le projet depuis `native/ios/project.yml` avec XcodeGen.
- [ ] Ouvrir `MinervaFlow.xcodeproj` dans Xcode.
- [ ] Dans **Signing & Capabilities**, sélectionner l’équipe Apple active et conserver **Automatically manage signing**.
- [ ] Vérifier que le bundle de l’app est exactement `com.minervaflow.loyalty`.
- [ ] Vérifier que le bundle du widget est exactement `com.minervaflow.loyalty.widget`.
- [ ] Compiler une archive Release sans erreur de signature.

### 2. Vérifier/créer l’App ID

Dans Apple Developer : **Certificates, Identifiers & Profiles → Identifiers**.

- [ ] Rechercher `com.minervaflow.loyalty`.
- [ ] S’il n’existe pas, créer un App ID explicite avec :
  - Description : `Minerva Flow`
  - Bundle ID : `com.minervaflow.loyalty`
- [ ] Activer **Sign in with Apple** :
  - Cliquer sur **Configure** / **Edit** à côté de Sign in with Apple.
  - Sélectionner **Enable as a primary App ID** (identifiant racine pour iOS, Web et futures cibles).
  - Laisser **Server-to-Server Notification Endpoint** vide (optionnel pour Apple, non pris en charge par Supabase Auth ; suppression de compte conforme guideline 5.1.1 déjà gérée in-app via `deleteAccount()`).
  - Sauvegarder la modale.
- [ ] Créer le **Services ID** pour le Web (Supabase Auth) :
  - **Identifiers → + → Services IDs**.
  - Description : `Minerva Flow Web`.
  - Identifier : `com.minervaflow.loyalty.web`.
  - Cocher **Sign in with Apple → Configure** :
    - Primary App ID : `com.minervaflow.loyalty`.
    - Domains and Subdomains : `minervaflow.app`.
    - Return URLs : `https://vcfaianbdjowmiqaheee.supabase.co/auth/v1/callback`.
- [ ] Créer la clé **Sign in with Apple** dans **Keys → +** :
  - Nom : `Minerva Flow Sign In with Apple Key`.
  - Cocher **Sign in with Apple → Configure** (Primary App ID `com.minervaflow.loyalty`).
  - Télécharger le fichier `.p8` et noter le **Key ID** (10 caractères).
- [ ] Configurer Supabase Dashboard (`vcfaianbdjowmiqaheee`) :
  - **Authentication → Providers → Apple** :
    - Services ID : `com.minervaflow.loyalty.web`.
    - Team ID : `NHMPLN46TN`.
    - Key ID : `<Key ID Apple>`.
    - Secret Key : `<contenu .p8>`.
- [ ] Activer **Push Notifications**.
- [ ] Activer **Associated Domains** pour `applinks:minervaflow.app`.
- [ ] Confirmer l’App Group partagé `group.com.minervatechnologies.shared` pour l’app et l’extension WidgetKit.
- [ ] Enregistrer les modifications.

### 3. Créer la clé APNs

Dans Apple Developer : **Keys → +**.

- [ ] Nom : `Minerva Flow APNs Production`.
- [ ] Cocher uniquement **Apple Push Notifications service (APNs)**.
- [ ] Arrêter ici et demander confirmation avant le clic final **Generate**.
- [ ] Après confirmation : générer, télécharger le fichier `.p8` une seule fois et noter le **Key ID**.
- [ ] Utiliser l’équipe `NHMPLN46TN` comme **Team ID**.
- [ ] Configurer les secrets serveur, jamais dans l’app :

```text
APNS_KEY_ID=<Key ID Apple>
APNS_TEAM_ID=NHMPLN46TN
APNS_PRIVATE_KEY=<contenu PEM du fichier .p8>
APNS_BUNDLE_ID=com.minervaflow.loyalty
APNS_ENVIRONMENT=production
```

- [ ] Pour une installation directe par Xcode seulement, employer `APNS_ENVIRONMENT=sandbox` côté serveur de développement.
- [ ] Envoyer un push réel à un appareil physique depuis une commande test et confirmer réception en arrière-plan et au premier plan.

## Phase 2 — App Store Connect

### 4. Créer la fiche Minerva Flow

Dans **App Store Connect → Apps → + → New App**.

- [ ] Plateforme : iOS.
- [ ] Nom : `Minerva Flow`.
- [ ] Langue principale : English (Canada) pour le premier lot de captures et métadonnées.
- [ ] Bundle ID : `com.minervaflow.loyalty`.
- [ ] SKU recommandé : `MINERVA-FLOW-IOS-001`.
- [ ] Accès utilisateur : accès complet pour l’équipe propriétaire uniquement.
- [ ] Ne pas déclarer d’achat intégré ni d’abonnement dans App Store Connect.

### 5. Contrats et fiscalité

- [ ] Confirmer que l’app est distribuée gratuitement.
- [ ] Ne pas signer de contrat d’applications payantes pour vendre le logiciel dans l’app si aucun IAP n’est prévu.
- [ ] Les paiements de commandes sont permis car ils concernent des repas/biens physiques ; ils ne doivent pas débloquer de fonctionnalités numériques Minerva Flow.
- [ ] Le parcours propriétaire doit indiquer sobrement que la gestion de l’abonnement logiciel se fait sur ordinateur, sans bouton, prix ni lien d’achat iOS.

## Phase 3 — Métadonnées et conformité

### 6. Description et liens publics

- [ ] Catégorie principale : **Business** ou **Food & Drink**, selon le positionnement final de l’app dans la fiche.
- [ ] Ajouter une description anglaise fidèle aux fonctionnalités réellement disponibles.
- [ ] Ajouter l’e-mail de support : `theminervabrand@gmail.com`.
- [ ] Ajouter l’URL de politique de confidentialité définitive de `minervaflow.app`.
- [ ] Ajouter l’URL d’assistance définitive de `minervaflow.app`.
- [ ] Vérifier que toutes les URL chargent sans connexion et sans erreur 404.
- [ ] Éviter toute promesse de fonctionnalité future, tout classement, tout prix d’abonnement ou toute mention de plateforme concurrente dans la fiche.

### 7. App Privacy

- [ ] Répondre à partir du comportement réel de production, y compris Supabase, Resend, Sentry, Sign in with Apple, Google Sign-In, APNs, emplacement, appareil photo et stockage de jetons de notification.
- [ ] Déclarer l’emplacement seulement s’il est réellement demandé et utilisé pour la découverte de restaurants proches.
- [ ] Déclarer l’appareil photo seulement pour le scan de code restaurant.
- [ ] Déclarer les identifiants de compte, coordonnées, données d’usage et diagnostics selon la configuration effective des SDK.
- [ ] Déclarer le lien à l’identité et le suivi uniquement si ces données le sont réellement. Ne jamais cocher « tracking » sans mécanisme réel.
- [ ] Comparer les réponses avec `PrivacyInfo.xcprivacy` et les flux de l’app avant envoi.

### 8. Évaluation d’âge, accès et modération

- [ ] Répondre aux questionnaires d’évaluation d’âge 2026 à partir des fonctionnalités réellement accessibles.
- [ ] Tester la suppression de compte depuis l’app et vérifier qu’elle supprime/révoque l’accès annoncé.
- [ ] Confirmer que les avis restaurant ne sont pas incités, filtrés par note ni conditionnés à une récompense.
- [ ] Confirmer que l’invite Google Maps est neutre pour toutes les notes et facultative.
- [ ] Fournir un mécanisme de signalement/modération si un écran expose du contenu généré par les utilisateurs au public.

## Phase 4 — Captures et fiche en anglais

### 9. Préparer les appareils et données de démonstration isolées

- [ ] Créer une organisation/restauration de test dédiée dans la production.
- [ ] Créer un compte propriétaire de test, avec rôle `owner` ou `manager`.
- [ ] Créer un compte client de test, relié uniquement au restaurant de test.
- [ ] Vérifier que ces données ne modifient ni clients, ni commandes, ni finances de restaurants réels.
- [ ] Préparer des images de plats, récompenses, offres, commandes, inventaire, équipe et transactions réalistes mais fictives.

### 10. Captures anglaises

- [ ] Utiliser des captures d’appareil réel ou de simulateur dans les tailles exigées par App Store Connect.
- [ ] Ne pas utiliser une image de connexion, de splash screen vide ou un écran de maquette comme capture principale.
- [ ] Capturer un parcours client : découverte, fidélité, menu/commande, récompense, profil.
- [ ] Capturer un parcours propriétaire : aperçu, commandes et notification client, menu, fidélité/avis, équipe, inventaire, finances, rapports et réglages.
- [ ] Vérifier que chaque texte visible est anglais pour la série anglaise.
- [ ] Éviter les prix, promotions ou informations qui ne correspondent pas au produit publié.
- [ ] Ajouter un texte d’accompagnement court, lisible et factuel à chaque capture si nécessaire.

## Phase 5 — Build TestFlight

### 11. Version et archive

- [ ] Incrémenter `MARKETING_VERSION` pour la version publique prévue.
- [ ] Incrémenter `CURRENT_PROJECT_VERSION` à chaque nouvel upload.
- [ ] Vérifier la version Release de `aps-environment` : `production`.
- [ ] Vérifier `PrivacyInfo.xcprivacy`.
- [ ] Vérifier les autorisations Info.plist : appareil photo, position, Face ID si utilisé.
- [ ] Vérifier que les messages de permissions expliquent précisément l’usage.
- [ ] Archiver depuis Xcode avec l’équipe `NHMPLN46TN`.
- [ ] Valider puis téléverser le build vers App Store Connect.

### 12. TestFlight interne d’abord

- [ ] Attendre le traitement Apple du build.
- [ ] Ajouter le build à un groupe de test interne.
- [ ] Inviter les deux Apple ID de test : propriétaire et client.
- [ ] Installer le build sur deux appareils physiques via TestFlight.
- [ ] Tester Sign in with Apple et Google, en production.
- [ ] Autoriser les notifications, vérifier l’enregistrement du jeton APNs et déclencher une commande prête.
- [ ] Vérifier e-mail, push iOS et affichage dans l’app ; confirmer l’absence de SMS.
- [ ] Tester menu, commande, fidélité, collaborateur, inventaire, finances, rapport, réglages et widgets.
- [ ] Tester avec un compte client sans privilège : aucune lecture/écriture propriétaire ne doit être possible.

### 13. TestFlight externe (facultatif avant App Review)

- [ ] Créer un groupe de test externe seulement lorsque le build interne est validé.
- [ ] Fournir le contexte de test, les comptes démo et les étapes de connexion à Apple pour Beta App Review.
- [ ] Ne jamais fournir de mot de passe en clair dans les notes ; utiliser des identifiants de démonstration révoquables.

## Phase 6 — Contrôle de sortie obligatoire

Exécuter avant tout upload de soumission App Store :

```bash
bash ~/.Codex/hooks/app-store-compliance-guard.sh "/Users/kaelbelceus/Flow by Minerva"
```

Si ce script n’est pas installé à ce chemin, utiliser le script de la skill
`app-store-compliance` ou installer le garde-fou avant de soumettre.

- [ ] Lint, TypeScript, tests web et build iOS Release réussissent.
- [ ] Le test réel des deux rôles réussit sur appareil TestFlight.
- [ ] Le backend de production est disponible pendant toute la période de revue.
- [ ] Les comptes de démonstration restent fonctionnels pendant la revue.
- [ ] Les déclarations App Privacy correspondent au comportement réel.
- [ ] Les métadonnées et captures correspondent au build.
- [ ] Aucune clé ni donnée sensible n’est committée dans Git.
- [ ] Aucun risque critique de conformité ne reste ouvert.

## Informations encore nécessaires

- [ ] Apple ID du testeur propriétaire.
- [ ] Apple ID du testeur client.
- [ ] URL publique définitive de support.
- [ ] URL publique définitive de confidentialité.
- [ ] Catégorie App Store finale : Business ou Food & Drink.
- [ ] Confirmation au moment de générer la clé APNs.

## Résultat attendu avant le premier TestFlight

Le build est signé avec l’équipe Apple correcte, les notifications APNs
arrivent sur un iPhone réel, les deux rôles testent des données isolées, et
la fiche App Store Connect contient une série complète de captures anglaises.
