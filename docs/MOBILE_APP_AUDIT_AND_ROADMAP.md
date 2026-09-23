# Minerva Flow — audit iOS et feuille de route white-label

> **État vérifié le 23 septembre 2026.** Ce document distingue les fonctions existantes, les artefacts locaux et ce qui reste à publier ou valider. Il ne vaut pas approbation de soumission Apple.

## 1. Produit mobile actuel

L’application est native en SwiftUI et utilise Supabase Auth et les données de Minerva Flow. Après résolution sécurisée du rôle, elle présente une expérience **client** ou **propriétaire/gérant** dans le même bundle iOS.

### Expérience client

- Accueil avec restaurants, contenu de fidélité et offres disponibles.
- Menu et commande directe lorsqu’un restaurant a activé le parcours correspondant.
- Onglets Scanner, Offres/Récompenses, Cartes et Profil.
- QR et code temporaire à six chiffres pour s’identifier au restaurant; le code peut aussi confirmer l’identité après recherche du client par téléphone.
- Partage de lien et QR de parrainage.
- Liens universels vers les parcours pris en charge.

### Expérience propriétaire/gérant

- Aperçu, commandes, menu, fidélisation et gestion dans l’application native.
- Données filtrées par workspace/restaurant et permissions.
- Sur iPad, présentation à colonnes; l’application déclare les orientations portrait, portrait inversé et paysage.

L’application web reste l’espace d’administration le plus complet. La documentation fonctionnelle commune est dans [le guide propriétaire et client](PRODUCT_GUIDE_OWNER_CLIENT.md).

## 2. État du build et de TestFlight

| Élément | État confirmé |
|---|---|
| Bundle iOS | `com.minervaflow.loyalty` |
| Version / build local | `1.0` / `11` |
| Cible | iPhone et iPad, iOS 17 minimum déclaré dans le projet |
| Signature/archive | Archive Release signée avec l’équipe configurée; export IPA réussi |
| Sentry | UUID du framework identique à celui du dSYM de l’archive (`F52B2FE8-3C4B-3651-B5BD-22388DDF800E`, arm64) |
| Téléversement App Store Connect | **Non effectué** : aucune session/fournisseur App Store Connect autorisé n’était disponible lors du contrôle |
| Lien bêta fourni | <https://testflight.apple.com/join/xGr45uuF> — son accessibilité ne prouve pas la présence du build 11 |

Le build 11 existe comme archive et IPA exportés sur le poste de génération; il n’est pas encore installable depuis le groupe TestFlight. Après connexion autorisée à App Store Connect, il reste à téléverser cet IPA, attendre le traitement Apple, associer le build au groupe de test et vérifier la version réellement proposée aux testeurs.

## 3. Contrôle de conformité effectué

Le garde-fou iOS exécuté le 23 septembre 2026 a trouvé **0 risque critique et 0 risque élevé**, avec deux points manuels :

1. confirmer la déclaration `ITSAppUsesNonExemptEncryption` pour l’extension Widget;
2. vérifier les comptes de démonstration, métadonnées/captures, déclarations de confidentialité, notes de révision et contrats dans App Store Connect.

Ce résultat est un contrôle statique, pas une validation « prêt à soumettre ». Les parcours propriétaires et clients sur appareil réel, les captures aux deux tailles, les déclarations App Privacy et l’accès de révision restent à confirmer avant diffusion externe.

## 4. Séquence de téléversement et de vérification

1. Ouvrir App Store Connect avec un compte membre autorisé de l’équipe Apple; ne jamais partager mot de passe ou code 2FA dans ce document.
2. Vérifier le bundle, la version 1.0 (build 11), l’équipe et les profils de signature.
3. Téléverser l’IPA de build 11 via Transporter ou Xcode Organizer.
4. Attendre le traitement Apple et relever le statut exact du build.
5. L’ajouter au groupe TestFlight souhaité et confirmer le lien avec un appareil de test.
6. Tester au minimum les comptes client et propriétaire, les commandes activées, le code de fidélité, les liens de parrainage, ainsi que l’iPad portrait/paysage.
7. Examiner les crashs et le dSYM Sentry, puis consigner les captures et résultats avant d’annoncer la mise à jour.

## 5. Objectif white-label — non équivalent à une fonctionnalité déjà livrée

Le workspace prend en charge des éléments d’identité de marque. Une offre white-label entièrement autonome par restaurant demande encore un pipeline contrôlé pour bundle IDs, icônes, configuration par tenant, certificats, fiches App Store/Google Play, paiements, intégrations et support. L’application Android cliente et l’automatisation de publication par client ne sont pas déclarées livrées ici.

Avant de vendre un déploiement client, valider l’isolation des tenants, les secrets côté serveur, le fonctionnement POS/Stripe réel, les droits légaux et les parcours de suppression/consentement sur les deux plateformes.

## 6. Livraison et tarification de commande

Les pages web exposent des parcours de menu, réservation et commande selon le restaurant. Une livraison façon marketplace, avec prix par distance/temps et paiement acheminé au compte propre du restaurant, ne doit pas être annoncée comme active sans un essai complet des zones, calculs serveur, paiement, POS, annulations, remboursements et notifications pour ce restaurant.
