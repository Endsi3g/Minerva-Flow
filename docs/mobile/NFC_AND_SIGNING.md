# Tags NFC et signature iOS

## Fonctionnalité

- **Lecture** (client) : bouton NFC de l'onglet Scanner. Un tag n'est suivi que s'il contient un lien `https://minervaflow.app/t/<code>` ou `/p/<code>` (`NFCTagURL.validated`, testé dans `NFCTagURLTests`). Tout autre contenu est refusé : n'importe qui peut écrire une URL sur un autocollant.
- **Programmation** (propriétaire) : Gestion › Tags NFC (`OwnerNFCView`). L'URL écrite est la même que celle du QR de « Points de contact » sur le web, donc l'attribution est identique.
- Le simulateur n'a pas de NFC : tester sur un iPhone réel avec un vrai tag NDEF.

## Signature : étape obligatoire avant tout archive ou installation

Le projet signe en **manuel** avec des profils nommés (`Minerva Flow Wallet Development`, `Minerva Flow Wallet App Store Distribution`). L'entitlement `com.apple.developer.nfc.readersession.formats = NDEF` est ajouté dans `MinervaFlow.entitlements` et `project.yml`, mais **aucun profil installé ne le contient** (vérifié le 2026-10-03). Sans régénération, la signature échoue.

1. developer.apple.com › Identifiers › `com.minervaflow.loyalty` › cocher **NFC Tag Reading** › Save.
2. Régénérer les profils *Wallet Development* et *Wallet App Store Distribution* (le profil de développement doit inclure l'appareil de test).
3. Télécharger/installer les profils, puis vérifier :
   `security cms -D -i <profil>.mobileprovision | grep -A2 nfc.readersession`
4. Ensuite seulement : archive et export.
