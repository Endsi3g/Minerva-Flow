# Minerva Flow pour ordinateur (macOS et Windows)

Coquille Tauri 2 qui charge le portail web (`https://www.minervaflow.app`) dans une fenêtre native. Une seule source de vérité : chaque correctif du portail profite à l'application.

## Ce que la coquille ajoute

- **Alertes** : notifications système (plugin `notification`) déclenchées par le portail.
- **Impression** : boîte d'impression du système (`print_page`) et envoi ESC/POS brut vers une imprimante thermique **du réseau local** (`print_escpos`, ports ≥ 1024, adresses privées seulement).
- **Mode caisse** : plein écran et fenêtre au premier plan (`set_kiosk`).
- **Instance unique** et écran de démarrage local avec message hors ligne.

Le portail parle à la coquille par `lib/desktop/bridge.ts` (no-op dans un navigateur). La capacité `src-tauri/capabilities/default.json` n'accorde l'IPC qu'aux origines `minervaflow.app`.

## Construire

Les installateurs sont construits dans le cloud (aucune chaîne Rust locale requise) :

1. GitHub → Actions → **Desktop apps** → *Run workflow* (tag `desktop-v0.1.0`), ou poussez un tag `desktop-v*`.
2. Le flux crée une **version brouillon** avec le `.dmg` macOS (universel) et le `.exe`/`.msi` Windows.
3. Vérifiez les installateurs, puis publiez le brouillon. La page `/download` du portail affiche alors la dernière version publiée.

Les icônes sont générées pendant la construction depuis `public/icon-512.png` (`npm run icons`).

## Signature

- **macOS** : il faut un certificat **« Developer ID Application »** (distinct des certificats « Apple Development » et « Apple Distribution », qui servent à l'App Store). Il se crée sur developer.apple.com > Certificates par le titulaire du compte. Ensuite, ajoutez dans GitHub > Settings > Secrets : `APPLE_CERTIFICATE` (le .p12 en base64), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY` (« Developer ID Application: … »), `APPLE_ID`, `APPLE_PASSWORD` (mot de passe d'app créé sur appleid.apple.com) et `APPLE_TEAM_ID`. Le flux signe et notarise alors automatiquement. Sans eux, le `.dmg` n'est pas signé et la page `/download/macos` explique le clic droit > Ouvrir.
- **Windows** : pas de certificat configuré. La page `/download/windows` présente l'avertissement SmartScreen (étapes illustrées) avant le bouton de téléchargement.

## Mises à jour automatiques

Déjà actives (indépendantes de la signature Apple et Microsoft) :

- Au démarrage (versions publiées seulement), l'application interroge `https://www.minervaflow.app/api/desktop/update`, qui sert le `latest.json` de la dernière version **publiée** (jamais un brouillon). Si une version plus récente existe, une fenêtre propose « Mettre à jour » ou « Plus tard », puis l'application redémarre.
- Les installateurs sont signés avec une clé de mise à jour Tauri : clé publique dans `src-tauri/tauri.conf.json`, clé privée dans le secret GitHub `TAURI_SIGNING_PRIVATE_KEY` et en copie locale `~/.minerva-secrets/minerva-flow-updater.key` (sans mot de passe). **Sauvegardez cette clé** : sans elle, les applications déjà installées ne pourraient plus recevoir de mise à jour.
- Pour publier une mise à jour : augmentez `version` dans `tauri.conf.json` et `Cargo.toml`, poussez un tag `desktop-vX.Y.Z`, vérifiez le brouillon, puis publiez-le.

## Développer en local (facultatif)

```bash
cd desktop && npm install && npm run icons && npm run dev
```
Demande Rust et plusieurs Go d'espace disque.
