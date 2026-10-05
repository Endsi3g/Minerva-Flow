# Minerva Flow pour Android

Kotlin et Jetpack Compose. Même base de données (règles d'accès par ligne) et mêmes routes pont que l'app iOS ; aucune clé serveur dans l'application.

## Ce qui est construit

**Client**
- Introduction, connexion par code courriel ou mot de passe, création de compte (case marketing décochée par défaut), accueil guidé en 3 étapes (Suivant, Retour, progression visible).
- Accueil : solde, statut et progression, prochaine récompense, commande (ouvre le portail web), promotions, activité récente, bonus d'installation.
- Offres : parrainage (progression « X / N amis », récompense, partage par la feuille de partage d'Android), promotions, récompenses avec « Prête à échanger » ou « Encore X pts », échange (code à montrer au personnel).
- Ma carte : QR (téléphone ou lien), numéro de téléphone modifiable, code de confirmation à 6 chiffres (5 minutes), ajout à Google Wallet.
- Compte : cartes, liens légaux, support, déconnexion, suppression du compte.

**Propriétaire ou gérant** (reconnu à l'ouverture de session)
- Aperçu (chiffre d'affaires du mois, commandes, clients), changement d'établissement.
- Commandes : file avec filtres, changement de statut (le client est averti).
- Menu : masquer ou afficher un plat (un brouillon reste à finir sur le web).
- Fidélité : comptoir (téléphone, code à 6 chiffres du client, montant, visite), liste de clients avec recherche, notes de l'équipe (invisibles pour le client).
- Compte : déconnexion, suppression (même règle que le web : le seul propriétaire d'un établissement doit d'abord le transférer).

Français par défaut, anglais selon la langue de l'appareil (test de parité des textes).

## Pas encore construit (présent sur iOS ou le web)

Équipe/ambassadeur, commande native avec panier, découverte et carte des restaurants, scanner QR et NFC, notifications (FCM), connexion Google, inventaire, finances, rapports, horaires, Google Business Profile, avis, widgets.

## Compiler et tester

```bash
brew install openjdk@17 gradle && brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17 ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "emulator" "system-images;android-35;google_apis_playstore;arm64-v8a"
cd native/android
echo "sdk.dir=$ANDROID_SDK_ROOT" > local.properties
./gradlew :app:assembleDebug :app:testDebugUnitTest
```

Pour Google Wallet, utiliser une image avec Google Play (`google_apis_playstore`).

## Publier sur Google Play (à faire par vous)

Compte Play Console (25 $ US, une fois), clé de signature, fiche (confidentialité, sécurité des données, URL de suppression de compte), et les variables Google Wallet côté serveur (voir `docs/private/REQUIS_A_Z.md`).
