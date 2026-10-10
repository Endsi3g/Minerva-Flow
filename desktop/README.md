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

- **macOS** : ajoutez les secrets `APPLE_CERTIFICATE` (base64 du .p12), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (mot de passe d'app), `APPLE_TEAM_ID`. Sans eux, le `.dmg` n'est pas signé.
- **Windows** : pas de certificat configuré; SmartScreen avertit à l'installation.
- **Mises à jour automatiques** : pas encore activées (nécessitent une paire de clés Tauri et le plugin `updater`).

## Développer en local (facultatif)

```bash
cd desktop && npm install && npm run icons && npm run dev
```
Demande Rust et plusieurs Go d'espace disque.
