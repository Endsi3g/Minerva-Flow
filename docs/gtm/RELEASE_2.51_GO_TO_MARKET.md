# Préparation du lancement Minerva Flow 2.51.0

**État au 5 octobre 2026 : web en production; annonce de release suspendue aux vérifications restantes.** Le code du portail équipe est intégré à `main`; Vercel signale `READY` pour le déploiement Production affecté aux domaines `minervaflow.app` et `www.minervaflow.app`. La version produit n'est pas encore publiée : `package.json` indique toujours `2.50.0`, le journal 2.51 n'a pas été créé et le dossier candidat conserve des contrôles manuels ouverts.

## Promesse et périmètre

Après validation, présenter les changements visibles réellement livrés : le portail équipe et ambassadeurs, les sous-pages de réglages, le partage de résultats, ainsi que l'organisation du compte client et du journal par audience. Présenter NFC comme hors périmètre. Ne pas annoncer une fonction iOS comme disponible dans le nouveau build tant qu'un artefact TestFlight à jour n'est pas distribué.

Le lancement s'adresse d'abord aux propriétaires et gestionnaires déjà actifs. Les clients voient les nouveautés client dans leur espace; le flux actuel ne leur envoie pas d'e-mail ni de notification push. La campagne de courriel de release doit utiliser uniquement le segment Resend explicitement inscrit et confirmé à la date de l'envoi. Le nombre historique de 22 contacts n'est pas une garantie de taille actuelle.

## Brouillon d'annonce — à utiliser après levée des conditions

**Objet :** Minerva Flow évolue : partage de résultats et espace équipe

**Pré-en-tête :** Découvrez les nouveautés disponibles dans votre espace Minerva Flow.

**Corps :**

Bonjour,

Une nouvelle mise à jour de Minerva Flow est disponible. Selon votre rôle, vous pouvez maintenant retrouver un espace équipe dédié, partager certains résultats sous forme de visuel ou de courte vidéo, et parcourir les réglages dans des pages plus claires.

Les changements qui concernent les clients apparaissent séparément dans leur espace « Nouveautés ».

Consultez le journal des nouveautés dans l'application pour voir les détails et vérifier les fonctions disponibles dans votre espace.

**Bouton :** Voir les nouveautés

Ce texte reste un brouillon : vérifier les parcours, captures et libellés finaux avant envoi. Le courriel doit utiliser le gabarit HTML de campagne déjà présent dans `lib/email/campaign-template.ts`, avec l'identité, l'adresse postale, le lien de désabonnement et l'expéditeur autorisé `Minerva Flow <flow@minervaflow.app>`.

## Canaux

1. **Dans l'application** — publier des entrées séparées pour les propriétaires et les clients, chacune avec une capture réelle. Le flux de publication automatique est à vérifier avant de créer une release GitHub : il peut envoyer des notifications à tous les membres d'un restaurant.
2. **Courriel** — après le courriel de contrôle interne, envoyer la campagne uniquement au segment actif et explicitement inscrit dans Resend. Ne pas envoyer à l'ensemble des comptes ni reprendre les 102 indicateurs de consentement en bloc.
3. **iOS/TestFlight** — annoncer une version iOS uniquement après traitement Apple et installation réelle du build testé.
4. **Acquisition** — présenter les nouveautés dans les démonstrations déjà prévues; attendre les résultats des pilotes avant d'ajouter des chiffres ou témoignages.

## Ordre de lancement

| Étape | Responsable de l'action | État |
| --- | --- | --- |
| Code 2.51 intégré à `main` | Dépôt | Fait; `main` et `origin/main` pointent sur `81c1ec8` |
| Déploiement web Production | Vercel | Fait; état `READY`, domaines de production affectés |
| Parcours authentifiés owner, équipe et partage en Preview | Accès de test | À faire; aucun compte/session accessible dans cette session |
| Captures réelles des deux entrées de journal | Accès à l'application | À faire; les captures synthétiques ne conviennent pas |
| NFC | Périmètre | Exclu de 2.51; ne pas le promouvoir |
| Vérification du cron Google Reviews | Exploitation | À vérifier ou exclure explicitement de la communication |
| Contrôle visuel iOS clair/sombre sur appareil | Testeur avec appareil | À faire; le build 1.0.1 (16) n'est pas distribué |
| Courriel de contrôle interne | Accès expéditeur | À faire avant la campagne |
| Entrées du journal puis campagne segmentée | Responsable publication | Après les étapes précédentes seulement |

## Mesure après lancement

- Avant l'envoi, enregistrer le nombre de destinataires autorisés, les rebonds et désabonnements du segment Resend.
- Après publication, suivre les vues du journal et les parcours `onboarding_completed`, `restaurant_created` et les événements déjà disponibles dans PostHog.
- Ajouter des événements dédiés au portail équipe et au partage avant de tirer des conclusions sur leur adoption.
- À 7 et 30 jours, comparer les actions réelles avec la période précédente; décrire les données observées sans les généraliser à tous les restaurants.
