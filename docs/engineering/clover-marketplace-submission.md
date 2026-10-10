# Clover App Market — fiche de préparation

État : brouillon interne, aucune fiche publique soumise.

## Reprise du 9 octobre 2026

- Clover est explicitement demandé par Kael; la découverte Vercel Marketplace ne propose que Shopify dans `commerce`, qui ne remplace pas Clover.
- Les identifiants locaux existants sont en **sandbox**. Ils ne sont pas copiés en Production. Le code d’authentification webhook n’est pas configuré localement.
- Composio expose les outils Clover mais ne trouve **aucune connexion active**. Le lien de connexion a été préparé et transmis à Kael; aucune autorisation marchande n’est présumée acquise.
- La connexion Composio permet les contrôles du compte marchand; elle ne prouve pas la création ni l’approbation de l’application Minerva Flow dans Clover App Market.
- La première lecture Safari montrait le compte en vérification et zéro application. La lecture suivante confirme une application « Minerva Flow - Loyalty & Rewards Apps » et la fenêtre de permissions ouverte. Les justifications sont encore vides; Save n’est pas vérifié. Safari reste consulté en lecture uniquement.
- Les fonctions de catalogue, ventes payées et webhooks existent dans le dépôt. Leur présence ne prouve pas une synchronisation réelle avec cette cliente.
- Le nouvel article **Plat de poisson** reste un brouillon non commandable. Ses trois accompagnements (riz blanc, riz djondjon, riz kolé) ont le même prix selon Kael; le montant reste inconnu. Il ne doit pas être envoyé à Clover avec un prix technique de zéro.
- Aucun catalogue ni stock distant Clover n’a été modifié dans cette reprise.

## Distribution confirmée par Kael

Application **publique** pour les restaurateurs Minerva Flow. Kael saisit les champs dans Safari. Le document `CLOVER_CHAMPS_A_SAISIR.md` contient les textes français/anglais et les justifications détaillées à copier. La saisie et la connexion marchande ne sont pas présumées terminées.

## Fiche proposée

- Nom : Minerva Flow
- Éditeur : Minerva Technologies Inc.
- Région de départ : Canada
- Type : application Web Clover App Market avec autorisation OAuth marchande.
- URL de l’application : `https://www.minervaflow.app`
- URL de lancement OAuth secondaire : `https://www.minervaflow.app/api/oauth/clover`
- Callback OAuth : `https://www.minervaflow.app/api/oauth/clover/callback`
- Site d’assistance : `https://www.minervaflow.app/fr/support`
- Courriel d’assistance : `flow@minervaflow.app`
- Confidentialité : `https://www.minervaflow.app/fr/legal/privacy`
- Conditions : `https://www.minervaflow.app/fr/legal/terms`
- Téléphone d’assistance confirmé par Kael : `(514) 451-5232`.
- Heures d’assistance : à confirmer; aucune plage horaire inventée.

### Accroche proposée

Reliez Clover à Minerva Flow pour synchroniser les ventes, organiser votre catalogue et piloter la fidélisation de votre restaurant.

### Description proposée

Minerva Flow relie Clover à vos outils de fidélisation et de gestion de restaurant. Après l’autorisation du propriétaire, les ventes payées peuvent être synchronisées pour alimenter l’historique des commandes et les analyses du restaurant. Le catalogue Clover peut être importé dans Minerva Flow sous forme de brouillons inactifs, puis vérifié et associé aux articles existants.

Les propriétaires et gestionnaires peuvent maintenir les associations entre articles de menu et articles Clover. Kael a demandé l’écriture du catalogue et des stocks. Les appels correspondants existent; leur activation demeure soumise à la connexion du marchand et à des tests réels. Chaque restaurant garde ses propres données et sa configuration dans Minerva Flow.

L’installation se fait par autorisation Clover. Les nouveaux articles importés restent inactifs jusqu’à leur vérification par le restaurant. Les droits Clover demandés doivent rester limités aux opérations réellement utilisées par l’intégration.

### Avantages marchands proposés

1. Synchronisez les ventes Clover payées avec l’historique des commandes et les rapports du restaurant.
2. Importez le catalogue Clover comme brouillons à vérifier avant de les activer dans Minerva Flow.
3. Reliez les articles du menu aux produits Clover pour maintenir les données opérationnelles alignées.

## Configuration technique attendue

- Préparer une application Web publique dans le portail développeur Clover; l’approbation du compte est requise avant la soumission. Tester d’abord une application sandbox distincte.
- Site URL : `https://www.minervaflow.app`.
- Alternate Launch Path : `/api/oauth/clover` sur le même domaine.
- Callback OAuth : `https://www.minervaflow.app/api/oauth/clover/callback`.
- Ajouter uniquement les autorisations Clover nécessaires à la lecture des marchands, ventes/commandes et catalogue ainsi qu’à l’écriture du catalogue si cette fonction est conservée.
- Enregistrer les identifiants de production dans Vercel (App ID, App Secret, environnement `production`) et le code d’authentification webhook Clover après vérification. Ne jamais réutiliser les identifiants sandbox en production.
- Enregistrer le webhook de production : `https://www.minervaflow.app/api/webhooks/clover`.
- Déployer ensuite l’intégration et vérifier l’autorisation d’un marchand de test et les parcours de lecture/synchronisation avant la soumission Clover.

## Éléments requis encore manquants

- Accès actif au Global Developer Dashboard Clover et compte développeur de production approuvé.
- Application Clover distincte en production, ses permissions finales et sa configuration OAuth vérifiées.
- Heures d’assistance et tarification Clover à confirmer; courriel et téléphone ont déjà été fournis par Kael.
- Au moins une capture d’écran réelle et à jour de l’intégration Minerva Flow avec Clover; les seules captures actuellement repérées dans `public/screenshots/` sont celles de connexion et ne démontrent pas le fonctionnement de Clover.
- Une démonstration vidéo fonctionnelle est souhaitable pour faciliter l’installation, même si la vidéo de fiche est facultative.
- Vérification des pages légales et de la conformité Clover avant soumission.
- Revue visuelle de la fiche dans l’aperçu Clover, puis autorisation de la soumettre au processus d’approbation.

## Parcours marchand à simplifier après l’approbation

1. Le propriétaire ouvre **Paramètres → Point de vente → Clover → Connecter**.
2. Clover affiche les permissions et le propriétaire autorise Minerva Flow.
3. Minerva Flow importe les ventes payées et présente un bouton **Importer le catalogue Clover**.
4. Les articles importés restent en brouillons inactifs; le propriétaire corrige les prix, variantes et allergènes, puis active seulement les articles vérifiés.
5. Un état de connexion et la date de la dernière synchronisation restent visibles dans les paramètres.

## Champs préparés et références

La configuration à saisir est regroupée dans `clover-production-setup.json`, sans secret. Le domaine OAuth et webhook utilise `www.minervaflow.app` : le domaine sans `www` redirige actuellement par HTTP 308.

Autorisations initiales : lecture du marchand, des commandes et de l’inventaire. Kael a choisi Write inventory. L’export de commandes et l’attribution d’employés ont une implémentation locale, dont l’activation et la validation marchande restent ouvertes. Customers et Payments ne sont pas encore implémentés; leurs justifications sont préparées. Abonnement webhook initial : commandes.

- [Autorisations Clover](https://docs.clover.com/dev/docs/permissions)
- [OAuth Clover et jetons expirants](https://docs.clover.com/dev/docs/oauth-flows-in-clover)
- [Vérification des webhooks Clover](https://docs.clover.com/dev/docs/webhooks)

Le premier lot de sécurisation OAuth est intégré à la préversion `2.52.0-rc.1` : échange sur l’hôte API, contrôle de la session et du marchand, erreurs Vault/DB signalées et jetons expirés refusés. `getValidCloverAccessToken` ne renouvelle pas encore les jetons : la rotation durable reste requise avant une connexion continue et une activation des paiements. Une simple saisie des clés ne suffit pas à certifier cette intégration. Aucun jeton de la cliente n’a été utilisé ou créé dans cette reprise.
