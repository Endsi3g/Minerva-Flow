# App Privacy — inventaire du build 1.0.1 (19)

Inventaire du code au 7 octobre 2026, préparé pour compléter App Store Connect. Il ne constitue pas une déclaration publiée. Le backend et les fournisseurs doivent être inclus dans la validation finale.

Apple considère une donnée comme collectée lorsqu’elle quitte l’appareil et reste accessible au-delà du traitement de la requête. Les pratiques des SDK tiers doivent aussi être déclarées. [Définition et catégories Apple](https://developer.apple.com/app-store/app-privacy-details/).

| Données | Parcours et preuve dans le code | Destination | Proposition à vérifier dans ASC |
| --- | --- | --- | --- |
| Courriel, nom, téléphone facultatif | Authentification, profil et fiches clients dans `SupabaseManager.swift` | Supabase / API Minerva Flow | Contact Info; liées au compte; App Functionality. Ajouter Developer’s Advertising or Marketing si ces champs servent aux campagnes autorisées. |
| Identifiant du compte et de la carte | Session Supabase, `customers.user_id`, commandes et fidélité | Supabase / API | User ID; lié au compte; App Functionality |
| Jeton APNs | `NotificationManager.swift`, `registerPushToken` | `device_push_tokens` et APNs | Identifiant de l’appareil pour la livraison des notifications; lié au compte. Confirmer la catégorie Apple exacte avant publication. |
| Commandes, achats et dépenses | Commandes et historique dans `SupabaseManager.swift` | Supabase / API | Purchase History; lié au compte; App Functionality. Vérifier Analytics et Product Personalization pour les usages du moteur de fidélité. |
| Points, visites, récompenses | `customers`, `loyalty_transactions`, `reward_redemptions` | Supabase / API | Autres données d’activité selon la taxonomie ASC; liées au compte; App Functionality. Vérifier les usages de rétention. |
| Photo de profil et photos d’avis | `uploadAvatar`, `uploadReviewImage` | Supabase Storage | Photos or Videos; liées au compte; App Functionality |
| Avis et contenu saisi | Formulaires d’avis, profil et notes selon le rôle | Supabase / API | Other User Content; lié au compte; App Functionality. Inclure les contenus accessibles aux propriétaires. |
| Position précise | `LocationManager` conserve le résultat en mémoire; `RestaurantMapView` trie les restaurants et ajuste la carte localement | Aucune écriture des coordonnées de l’utilisateur trouvée dans ces parcours; MapKit reste à examiner | Le manifeste déclare actuellement Precise Location. Confirmer le trafic MapKit, la conservation fournisseur et les autres parcours avant de modifier cette réponse. |
| Crash et diagnostics | `MinervaFlowApp.swift` initialise Sentry pour l’environnement production | Projet Sentry iOS | Crash Data; App Functionality. Le code n’appelle pas `setUser`; vérifier le contenu réel des événements et les valeurs par défaut du SDK pour le lien à l’identité et les diagnostics additionnels. |
| Rappels de menu | `scheduleMenuViewReminder` / `cancelMenuViewReminder` | Notifications locales sur l’appareil | Aucun envoi serveur dans ce parcours; ne pas confondre avec les notifications APNs. |

## Contrôles avant la déclaration finale

- Vérifier les événements réellement ingérés par Sentry, avec un compte de test, sans exposer leurs données.
- Examiner les finalités réelles des données de fidélité et les campagnes selon les consentements; le choix des finalités ne se déduit pas du seul nom des tables.
- Vérifier les réponses Apple, Google Sign In et MapKit ainsi que les réglages fournisseur correspondant au build distribué.
- Contrôler les données de contenu et de gestion accessibles dans l’espace propriétaire, y compris les informations des collaborateurs.
- Confirmer le choix « pas de tracking » contre le build et les fournisseurs. `PrivacyInfo.xcprivacy` indique `NSPrivacyTracking=false`, sans domaine de tracking; cela ne prouve pas à lui seul l’absence de tracking côté fournisseur.
- Faire approuver le récapitulatif final avant le bouton de publication de la déclaration App Privacy.

La suppression de compte doit être vérifiée sur un compte jetable et dans la configuration servie au build. Le parcours du seul propriétaire exige d’abord un transfert de son établissement; cette règle doit apparaître dans les instructions d’examen.
