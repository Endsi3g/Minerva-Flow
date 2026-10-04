# Clover App Market — fiche de préparation

État : brouillon interne, aucune fiche publique soumise.

## Fiche proposée

- Nom : Minerva Flow
- Éditeur : Minerva Technologies Inc.
- Région de départ : Canada
- Type : application Web Clover App Market avec autorisation OAuth marchande.
- URL de l’application : `https://minervaflow.app`
- URL de lancement OAuth secondaire : `https://minervaflow.app/api/oauth/clover`
- Callback OAuth : `https://minervaflow.app/api/oauth/clover/callback`
- Site d’assistance : `https://minervaflow.app`
- Courriel d’assistance : `flow@minervaflow.app`
- Confidentialité : `https://minervaflow.app/fr/legal/privacy`
- Conditions : `https://minervaflow.app/fr/legal/terms`
- Téléphone et heures d’assistance : à fournir par Minerva Technologies Inc.

### Accroche proposée

Reliez Clover à Minerva Flow pour synchroniser les ventes, organiser votre catalogue et piloter la fidélisation de votre restaurant.

### Description proposée

Minerva Flow relie Clover à vos outils de fidélisation et de gestion de restaurant. Après l’autorisation du propriétaire, les ventes payées peuvent être synchronisées pour alimenter l’historique de fidélisation et les analyses du restaurant. Le catalogue Clover peut être importé dans Minerva Flow sous forme de brouillons inactifs, puis vérifié et associé aux articles existants.

Les propriétaires et gestionnaires peuvent aussi maintenir les associations entre articles de menu et articles Clover, puis synchroniser les modifications de catalogue et les quantités d’inventaire prises en charge. Chaque restaurant garde ses propres données et sa configuration dans Minerva Flow.

L’installation se fait par autorisation Clover. Les nouveaux articles importés restent inactifs jusqu’à leur vérification par le restaurant. Les droits Clover demandés doivent rester limités aux opérations réellement utilisées par l’intégration.

### Avantages marchands proposés

1. Synchronisez les ventes Clover payées avec l’historique de fidélisation et les rapports du restaurant.
2. Importez le catalogue Clover comme brouillons à vérifier avant de les activer dans Minerva Flow.
3. Reliez les articles du menu aux produits Clover pour maintenir les données opérationnelles alignées.

## Configuration technique attendue

- Créer une application Web en production dans le portail développeur Clover après approbation du compte développeur de production.
- Site URL : `https://minervaflow.app`.
- Alternate Launch Path : `/api/oauth/clover` sur le même domaine.
- Callback OAuth : `https://minervaflow.app/api/oauth/clover/callback`.
- Ajouter uniquement les autorisations Clover nécessaires à la lecture des marchands, ventes/commandes et catalogue ainsi qu’à l’écriture du catalogue si cette fonction est conservée.
- Enregistrer les identifiants de production dans Vercel (App ID, App Secret, environnement `production`) et le code d’authentification webhook Clover après vérification. Ne jamais réutiliser les identifiants sandbox en production.
- Enregistrer le webhook de production : `https://minervaflow.app/api/webhooks/clover`.
- Déployer ensuite l’intégration et vérifier l’autorisation d’un marchand de test et les parcours de lecture/synchronisation avant la soumission Clover.

## Éléments requis encore manquants

- Accès actif au Global Developer Dashboard Clover et compte développeur de production approuvé.
- Application Clover distincte en production, ses permissions finales et sa configuration OAuth vérifiées.
- Approbation explicite des coordonnées d’assistance à afficher publiquement, dont un numéro de téléphone et les heures d’assistance.
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
