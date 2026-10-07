# Préparation du lancement Minerva Flow 2.51.0

**État au 6 octobre 2026 : correctifs web déployés en Production (`a2600d6`) et routes authentifiées validées.** Les 14 adhésions de l’utilisateur test renvoient leurs noms; les endpoints de fiche restaurant, branding et QR répondent 200. Le build iOS 1.0.1 (19) a été téléversé à App Store Connect; son dernier état connu était « en traitement ». L’adresse officielle complète est « 367 rue Lberge, Repentigny (Québec) J6A 4C2, Canada », sans suite, avec le téléphone (514) 451-5232; les coordonnées sont prêtes pour publication dans les CGV et l’annonce email.

La migration Supabase `0179_resolve_restaurant_connection_token` est appliquée en Production. La clé serveur Vercel a été alignée sur la clé Supabase active; les routes corrigées répondent maintenant 200 en Production authentifiée. Le compte `dev-test@minervaflow.app` a 14 adhésions de restaurant réelles, et l’app charge ses données. Le scénario de liaison QR d’un compte sans adhésion reste à valider de bout en bout. Le build Debug 1.0.1 (19) est installé et lancé sur l’iPhone 13; le dernier état de traitement transmis par App Store Connect était en cours. La disponibilité TestFlight reste à re-vérifier avant toute annonce.

Le Preview de la branche `fix/team-login-redirect` (PR #176) sert `/equipe/connexion`; les parcours authentifiés owner, équipe et partage restent à vérifier. Dans Resend, le segment global compte 102 contacts, dont 57 désabonnés; 22 contacts sont attestés actifs et inscrits. Le nouvel email de contrôle à `kbelceus776@gmail.com` est livré. Le brouillon détaillé `73a16f1d-617b-46be-b536-98e281593c88` vise toujours le segment explicite uniquement. Son HTML a été aperçu en mobile et bureau; le contenu de Composer TipTap est nul, donc le brouillon reste en HTML pour préserver sa mise en page. La fiche App Store 1.0 reste à finaliser : déclarations App Privacy, captures et identifiants d’examen sont à compléter.

## Promesse et périmètre

Après validation, présenter les changements visibles réellement livrés : le portail équipe et ambassadeurs, les sous-pages de réglages, le partage de résultats, ainsi que l'organisation du compte client et du journal par audience. Présenter NFC comme hors périmètre. Ne pas annoncer une fonction iOS comme disponible dans le nouveau build tant qu'un artefact TestFlight à jour n'est pas distribué.

Le lancement s'adresse d'abord aux propriétaires et gestionnaires déjà actifs. Les clients voient les nouveautés client dans leur espace; le flux actuel ne leur envoie pas d'e-mail ni de notification push. La campagne de courriel de release doit utiliser uniquement le segment Resend explicitement inscrit et confirmé à la date de l'envoi. Au contrôle live du 6 octobre, ce segment comptait 22 contacts actifs; le segment global contenait 102 contacts, dont 57 désabonnés. Ne pas remplacer ce segment par la base entière ni par les 45 contacts globalement non désabonnés.

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
| Code 2.51 intégré à `main` | Dépôt | Fait; merge de la branche du portail équipe `590ac6c` présent dans `main` |
| Déploiement web Production | Vercel | Fait; état `READY`, domaines de production affectés |
| Parcours authentifiés owner, équipe et partage en Preview | Accès de test | À faire; aucun compte/session accessible dans cette session |
| Captures réelles des deux entrées de journal | Accès à l'application | À faire; les captures synthétiques ne conviennent pas |
| NFC | Périmètre | Exclu de 2.51; ne pas le promouvoir |
| Vérification du cron Google Reviews | Exploitation | À vérifier ou exclure explicitement de la communication |
| Contrôle visuel iOS clair/sombre sur appareil | Testeur avec appareil | Build 1.0.1 (19) envoyé; attendre le traitement Apple puis vérifier les parcours |
| Courriel de contrôle interne | Accès expéditeur | À faire avant la campagne |
| Entrées du journal puis campagne segmentée | Responsable publication | Après les étapes précédentes seulement |

## Mesure après lancement

- Avant l'envoi, enregistrer le nombre de destinataires autorisés, les rebonds et désabonnements du segment Resend.
- Après publication, suivre les vues du journal et les parcours `onboarding_completed`, `restaurant_created` et les événements déjà disponibles dans PostHog.
- Ajouter des événements dédiés au portail équipe et au partage avant de tirer des conclusions sur leur adoption.
- À 7 et 30 jours, comparer les actions réelles avec la période précédente; décrire les données observées sans les généraliser à tous les restaurants.

## Plan d’exécution — prêt pour activation

Le jour J commence après validation des parcours et du courriel interne. La communication web peut partir séparément de la publication iOS, à condition de ne pas annoncer un nouveau build iOS disponible.

| Moment | Action | Livrable | Mesure |
| --- | --- | --- | --- |
| J−1 | Vérifier owner, équipe, partage et compte client; capturer les écrans réels | Captures desktop/mobile et compte rendu des parcours | Aucun parcours bloquant |
| J | Publier les nouveautés par audience et envoyer le brouillon aux contacts inscrits | Journal propriétaire/client + campagne Resend | Destinataires autorisés, livraisons, rebonds, désabonnements |
| J+1 | Ajouter les nouveautés aux démonstrations et au support | Script ci-dessous | Questions reçues et problèmes reproduits |
| J+3 | Publier une présentation du portail équipe sur les comptes sociaux connectés et autorisés | Texte ci-dessous + capture réelle | Visites vers le site et demandes de démonstration |
| J+7 | Examiner les parcours réellement utilisés et répondre aux retours | Bilan d’adoption sans promesse chiffrée | Vues du journal, activations, retours support |
| J+14 | Démontrer le partage de résultats avec des données de démonstration | Courte vidéo et guide | Utilisation observée et demandes de pilote |
| J+30 | Comparer avec la période précédente et ajuster le positionnement | Bilan du lancement | Activation, rétention et désabonnements |

### Positionnement

Minerva Flow aide les restaurateurs à réunir leur fidélisation, leurs commandes et leur relation client dans un même espace. Cette mise à jour clarifie les accès de l’équipe et facilite la présentation de résultats disponibles dans l’application.

### Publication sociale préparée

Votre équipe retrouve désormais son espace dédié dans Minerva Flow. Les réglages sont mieux organisés et certains résultats peuvent être partagés sous forme de visuel ou de courte vidéo, selon les permissions du compte.

Découvrez les nouveautés dans votre espace : https://minervaflow.app/changelog

Utiliser une capture réelle, sans coordonnées clients ni données confidentielles. Les comptes sociaux et le calendrier exact restent à sélectionner; ce texte n’a pas été publié.

### Script de démonstration (5 minutes)

1. Montrer les accès du propriétaire, de l’équipe et des ambassadeurs avec des comptes de démonstration.
2. Ouvrir les sous-pages de réglages et expliquer les permissions.
3. Partager un résultat de démonstration et vérifier le rendu exporté.
4. Montrer les nouveautés distinctes du compte client.
5. Recueillir une question et proposer une démonstration adaptée au restaurant.

### Suivi et responsabilités

Conserver le propriétaire du lancement dans l’application et consigner les résultats à J+7 et J+30. Le budget publicitaire initial est nul : aucun achat média ni promesse de performance sans campagne et objectif approuvés. L’activation des canaux sociaux exige les comptes concernés; aucune publication externe n’a encore été effectuée.

## État des blocages — 6 octobre 2026

- Le brouillon Resend détaillé reste non envoyé. Le segment autorisé demeure les 22 contacts explicitement inscrits; 57 contacts de la base globale sont désabonnés et 45 autres n'ont pas de consentement attesté. Le nouvel email de contrôle à `kbelceus776@gmail.com` a été livré après l’aperçu local mobile et bureau.
- La migration `0179_resolve_restaurant_connection_token` est appliquée en Production; l’onboarding QR complet d’un compte sans adhésion reste à vérifier avec un tel compte.
- Les CGV commerciales FR/EN sont préparées avec les règles confirmées : essai de 14 jours, taxes selon la loi; pas de remboursement après débit, sous réserve des droits impératifs et de la correction des erreurs. L’adresse « 367 rue Lberge, Repentigny (Québec) J6A 4C2, Canada », sans suite, et le téléphone (514) 451-5232 sont confirmés. Le pied de page email reprend ces coordonnées, le site et l’adresse de soutien.
- Aucun email, entrée de journal, post social ou webhook de publication n'a été déclenché. Envoyer la campagne uniquement après déploiement vérifié et contrôle interne.
