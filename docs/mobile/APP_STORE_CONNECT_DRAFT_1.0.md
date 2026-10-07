# Fiche App Store Connect — brouillon 1.0

**État : contenu prêt à relire; rien n’a été saisi ni publié dans App Store Connect.** La session App Store Connect actuellement ouverte est expirée. Le build transmis est `1.0.1 (19)`; sa disponibilité TestFlight n’a pas pu être relue dans le compte.

Apple exige une capture iPhone avec Dynamic Island de taille moyenne et, puisque l’app cible aussi iPad, une capture iPad 13 pouces. Les captures natives présentes dans `docs/screenshots/native-app/` sont en 1206 × 2622 (taille iPhone moyenne), mais elles datent de septembre et ne documentent pas cette version. Il faut produire des captures actuelles sur des comptes de test avant de les téléverser. [Spécifications officielles des captures](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

## Informations communes

| Champ | Valeur proposée | État |
| --- | --- | --- |
| Nom | Minerva Flow | 12 caractères |
| Catégorie principale | Food & Drink | À confirmer dans App Store Connect |
| Catégorie secondaire | Business | Facultatif; à confirmer |
| URL marketing | https://minervaflow.app | Publique |
| Icône | `native/ios/MinervaFlow/Resources/Assets.xcassets/AppIcon.appiconset/icon-1024.png` | PNG 1024 × 1024 intégré au build; visuellement vérifié |
| Politique de confidentialité (FR) | https://minervaflow.app/fr/legal/privacy | Publique; le lien final redirige vers la page canonique |
| Privacy Policy (EN) | https://minervaflow.app/en/legal/privacy | Publique; vérifier la localisation anglaise du contenu avant soumission |
| Assistance (FR) | https://minervaflow.app/fr/app-support | Nouvelle page publique; vérifier après déploiement |
| Support (EN) | https://minervaflow.app/en/app-support | Nouvelle page publique; vérifier après déploiement |
| Copyright | 2026 Minerva Technologies Inc. | À saisir par localisation |

Apple indique que le nom et le sous-titre sont limités à 30 caractères, le texte promotionnel à 170 caractères et les mots-clés à 100 octets. La description est limitée à 4 000 caractères. [Référence officielle des champs](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)

## Français (Canada)

**Sous-titre — 25 caractères**

> Fidélité pour restaurants

**Texte promotionnel — 112 caractères**

> Clients et restaurants : cartes de fidélité, points, récompenses et commandes réunis dans une seule application.

**Description**

> Minerva Flow aide les restaurants à fidéliser leurs clients et permet aux membres de suivre leurs avantages.
>
> Pour les clients :
> • Retrouvez les restaurants participants et consultez vos cartes de fidélité.
> • Suivez vos points, vos visites, votre historique et les récompenses offertes.
> • Parcourez les menus et passez commande lorsque le restaurant propose cette option.
> • Gérez votre profil et vos préférences de notifications.
>
> Pour les restaurants et leurs équipes :
> • Configurez un programme fidélité et partagez son code QR d’inscription.
> • Gérez les membres, les points, les récompenses et les commandes selon vos autorisations.
> • Consultez les activités et les nouveautés destinées à votre rôle.
>
> Les fonctionnalités offertes dépendent de la configuration de chaque restaurant et d’une connexion Internet. L’accès aux outils de gestion exige un compte et les autorisations correspondantes.

**Mots-clés — 75 octets UTF-8**

> fidélité,points,récompenses,restaurant,carte,commande,menu,café,visites

**Nouveautés pour 1.0.1 (19)**

> Connexion par code à usage unique par courriel, démarrage restaurant simplifié et accès plus clair aux cartes, aux points et à l’historique.

## English (Canada)

**Subtitle — 26 characters**

> Restaurant loyalty rewards

**Promotional text — 83 characters**

> Bring restaurant loyalty together: cards, points, rewards, and ordering in one app.

**Description**

> Minerva Flow helps restaurants build loyalty and gives guests a simple way to keep track of their rewards.
>
> For guests:
> • Find participating restaurants and view your loyalty cards.
> • Check your points, visits, history, and available rewards.
> • Browse menus and place orders where the restaurant offers ordering.
> • Manage your profile and notification preferences.
>
> For restaurants and their teams:
> • Set up a loyalty program and share its enrollment QR code.
> • Manage members, points, rewards, and orders according to your access.
> • Review activity and updates for your role.
>
> Features depend on each restaurant’s setup and an internet connection. Restaurant management tools require an account with the appropriate permissions.

**Keywords — 64 UTF-8 bytes**

> loyalty,points,rewards,restaurant,card,ordering,menu,cafe,visits

**What’s New for 1.0.1 (19)**

> Email sign-in codes, a clearer restaurant setup, and easier access to loyalty cards, points, and history.

## Privacy declarations — not ready to publish

Inventaire détaillé du build 19 : [App Privacy — données et parcours](APP_PRIVACY_DATA_MAP_BUILD_19.md). Les destinations et usages constatés dans le code sont consignés; la déclaration finale et les réglages fournisseur restent à confirmer.

Apple requires the app and third-party SDK data practices to be represented accurately. The final Publish button attests to accuracy, App Review Guideline compliance, and applicable law. The repository only supplies a starting inventory; it does **not** establish every Apple data type, whether it is linked to identity, retention, or purpose. [Apple’s App Privacy workflow](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)

Items to reconcile against the exact uploaded build and provider settings before entering labels:

- Account/contact data: email, name, and optional phone number.
- Identifiers: authenticated account identifier and APNs device token.
- Loyalty/order data: points, visits, rewards, order activity and spend fields returned to the customer app.
- Location: the manifest lists precise location. Verify where coordinates travel, whether they are retained, and whether Apple considers them linked to an account.
- Diagnostics: Sentry is initialized for native crash reporting. Confirm its actual event payload and whether a user identity is attached.
- User content: profile photos and other images if the shipped native build uploads them.
- Tracking: the native manifest says tracking is false and has no tracking domains; confirm no SDK/build configuration changes that conclusion.
- SDKs/providers: Supabase, Sentry, Apple Sign In and Google Sign In. Include third-party collection, not only Minerva’s database.

The app’s privacy manifest currently lists email, name, precise location and crash data. It is not proof that App Store Connect labels are complete. Do not publish until the owner reviews the data-flow mapping and approves the final declaration.

## App Review information still required

- A permanent, working owner account and a permanent customer account, with passwords entered only in App Store Connect.
- Review contact name, email and phone in international format.
- Short steps for owner, customer, restaurant QR enrollment, account deletion and the features not included in build 19 (NFC).
- Complete Apple’s current age-rating questionnaire, encryption/export questions, pricing/availability and agreements.
- Upload current real iPhone and iPad screenshots in French and English. The 1024 × 1024 logo is present in the app bundle; confirm the processed build shows it in App Store Connect.
- Confirm build 19 has completed processing and is available to the intended TestFlight group.

## Review notes draft (no credentials)

Minerva Flow has a customer experience and role-restricted restaurant management tools. Sign in with the provided customer or owner demo account using the email/password option. A customer with no restaurant membership can connect to a participating restaurant through its enrollment QR code. Account deletion is available under Account → Security. Build 1.0.1 (19) does not include NFC. Subscription and payment management open the web service; no payment SDK or in-app purchase is provided by this iOS build.

This note is incomplete until both permanent demo accounts have been tested against the exact production backend and their credentials are entered in App Store Connect.
