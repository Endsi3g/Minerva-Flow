# Tags NFC et signature iOS

## État de la release 1.0.1 (build 19)

Le NFC est désactivé pour cette release TestFlight à la demande du propriétaire. Le bouton de lecture, l'entrée de programmation propriétaire, le texte d'autorisation NFC et l'entitlement NFC ont été retirés du build. Le lecteur reste dans le code source, mais `NFCFeatureEnabled` vaut `false`; aucune session NFC ne peut être lancée. Les profils Development et App Store installés ne contiennent pas cette capacité et signent maintenant l'app sans elle.

Pour réactiver le NFC dans une release future : activer **NFC Tag Reading** sur l'identifiant `com.minervaflow.loyalty`, régénérer les profils Development/App Store, rétablir l'entitlement et l'autorisation dans la fiche, puis remettre `NFCFeatureEnabled` à `true` et vérifier lecture/écriture sur un iPhone réel.

## Fonctionnalité

- **Lecture** (client) : bouton NFC de l'onglet Scanner. Un tag n'est suivi que s'il contient un lien `https://minervaflow.app/t/<code>` ou `/p/<code>` (`NFCTagURL.validated`, testé dans `NFCTagURLTests`). Tout autre contenu est refusé : n'importe qui peut écrire une URL sur un autocollant.
- **Programmation** (propriétaire) : Gestion › Tags NFC (`OwnerNFCView`). L'URL écrite est la même que celle du QR de « Points de contact » sur le web, donc l'attribution est identique.
- Le simulateur n'a pas de NFC : tester sur un iPhone réel avec un vrai tag NDEF.

## Signature : état des profils

Le projet signe en **manuel** avec des profils nommés (`Minerva Flow Wallet Development`, `Minerva Flow Wallet App Store Distribution`). Les profils installés n'ont pas l'entitlement NFC; c'est conforme au build 17, qui ne déclare plus cette capacité.

Pour une future release avec NFC, l'administrateur Apple doit :

1. developer.apple.com › Identifiers › `com.minervaflow.loyalty` › cocher **NFC Tag Reading** › Save.
2. Régénérer les profils *Wallet Development* et *Wallet App Store Distribution* (le profil de développement doit inclure l'appareil de test).
3. Télécharger/installer les profils, puis vérifier :
   `security cms -D -i <profil>.mobileprovision | grep -A2 nfc.readersession`
4. Ensuite seulement : archive et export.
