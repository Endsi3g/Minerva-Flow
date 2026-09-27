# Minerva Flow — audit iOS et feuille de route white-label

> **État vérifié le 27 septembre 2026 (passe Owner/Google).** Ce document distingue les fonctions existantes, les artefacts locaux et ce qui reste à publier ou valider. Il ne vaut pas approbation de soumission Apple.

## 1. Produit mobile actuel

L’application est native en SwiftUI et utilise Supabase Auth et les données de Minerva Flow. Après résolution sécurisée du rôle, elle présente une expérience **client** ou **propriétaire/gérant** dans le même bundle, sur iPhone, iPad et Mac Catalyst.

### Expérience client

- Accueil avec restaurants, contenu de fidélité et offres disponibles.
- Menu et commande directe lorsqu’un restaurant a activé le parcours correspondant.
- Onglets Scanner, Offres/Récompenses, Cartes et Profil.
- QR et code temporaire à six chiffres pour s’identifier au restaurant; le code peut aussi confirmer l’identité après recherche du client par téléphone.
- Partage de lien et QR de parrainage.
- Liens universels vers les parcours pris en charge.

### Expérience propriétaire/gérant

- Aperçu, commandes, menu, fidélisation et gestion dans l’application native.
- Sur iPad et Mac Catalyst, barre latérale, raccourcis clavier et vues adaptées au grand écran. La section Gestion contient les outils et réglages du compte.
- Google Business Profile : connexion OAuth native, choix de fiche, chargement progressif des comptes, fiches et avis Google, réponses et modification des horaires. La découverte respecte la limite Google de 20 comptes par page; les curseurs répétés sont détectés. Les avis affichent un compteur et conservent la portée du workspace; le propriétaire doit sélectionner une fiche qui lui est déjà accessible dans Google.
- Données filtrées par workspace/restaurant et permissions.
- Sur iPad, présentation à colonnes; l’application déclare les orientations portrait, portrait inversé et paysage.

L’application web reste l’espace d’administration le plus complet. La documentation fonctionnelle commune est dans [le guide propriétaire et client](PRODUCT_GUIDE_OWNER_CLIENT.md).

## 2. État du build et de TestFlight

| Élément | État confirmé |
|---|---|
| Bundle iOS | `com.minervaflow.loyalty` |
| Version / build distribué | `1.0.0` / `15` |
| Candidate locale en cours | `1.0.1` / `16` |
| Cible | iPhone et iPad, iOS 17 minimum; Mac Catalyst 15 minimum |
| Signature/archive | Archive Release signée avec l’équipe configurée; export IPA réussi |
| Téléversement App Store Connect | Build `1.0.0 (15)` traité (`VALID`), assigné aux groupes TestFlight interne et externe; révision bêta externe `APPROVED` |
| Lien bêta | <https://testflight.apple.com/join/xGr45uuF> — groupe externe public activé; URL vérifiée HTTP 200 |

### Candidate 1.0.1 (16) — état de vérification du 27 septembre

- Un IPA iOS Release signé existe localement, mais il précède les derniers changements Owner/Google. Il doit être reconstruit et vérifié avant tout téléversement; la candidate n’est pas distribuée.
- L’application compile en Debug pour iPad et Mac Catalyst avec la source actuelle. Pour macOS, la compilation Catalyst est sans signature : l’archive Release ne possède pas de profil de distribution Catalyst et ne peut pas être livrée.
- Le projet Google Cloud a reçu l’approbation Business Profile selon le propriétaire. Les migrations `0162`, `0163` et `0164` sont appliquées aux deux bases; les routes API restent à livrer avec le déploiement web.
- Les requêtes natives Google envoient l’identifiant du workspace dans les GET comme dans les mutations. Le changement de restaurant efface les anciennes données de fiche et ignore les réponses réseau d’un ancien espace. L’éditeur d’horaires garde les plages multiples et les fermetures le jour suivant.
- Tests : 333 tests Vitest et build/typecheck web étaient verts au dernier commit vérifié; le worktree web actuel doit être revérifié. Les 19 tests unitaires iOS existants, 5 tests d’URL Owner et 6 tests XCTest Auth passent. Les tests Google/Supabase ciblés passent désormais 12/12; les tests URL Owner passent 5/5 sur simulateur. Le sélecteur confirme le changement et le retour à la langue mémorisée. Le lint global demeure en échec sur 400 erreurs réparties dans le dépôt; le lint ciblé des fichiers touchés a 0 erreur et 1 avertissement préexistant.
- Le contrôle App Store du candidat compte 0 critique, 0 élevé et 1 avertissement; les métadonnées, le compte démo, la confidentialité et la revue humaine restent à confirmer. Rapports : `.verify-artifacts/20260927T1812Z/report.md`, `.verify-artifacts/20260927T1841Z/report.md` (pagination des avis) et `.verify-artifacts/20260927T2131Z/report.md` (comptes et fiches paginés).
- **Recommandation : NOT READY pour téléversement TestFlight.** L’authentification Owner, l’OAuth Google réel et l’aspect des vues Owner avec un compte de test restent à valider. La signature de distribution Catalyst est absente et l’IPA local doit être reconstruit.

Le build 15 contient les changements natifs précédents et est approuvé pour les testeurs externes. La candidate 1.0.1 (16) est en cours de validation locale; aucun nouvel artefact n’a été téléversé à App Store Connect. L’installation sur appareil physique et la validation par une propriétaire de sa fiche Business Profile restent à faire.

## 3. Contrôle de conformité effectué

Le garde-fou iOS exécuté sur le build 15 le 27 septembre 2026 a trouvé **0 risque critique, 1 détection élevée et 7 avertissements**. La détection élevée est un faux négatif de recherche de texte : la suppression de compte est implémentée dans `ProfileView.swift` et `SupabaseManager.swift`, mais le scanner ne retrouve pas le code source Swift dans le binaire compilé. Les contrôles manuels suivants restent requis :

1. confirmer la déclaration `ITSAppUsesNonExemptEncryption` pour l’extension Widget;
2. vérifier les comptes de démonstration, métadonnées/captures, déclarations de confidentialité, notes de révision et contrats dans App Store Connect.

Ce contrôle statique n’est pas un audit de soumission App Store. Apple a approuvé le build pour TestFlight; cela n’équivaut pas à une approbation App Store. Les parcours propriétaires et clients sur appareil réel, les déclarations App Privacy et la suppression de compte doivent encore être revus manuellement.

## 4. Séquence de téléversement et de vérification

1. Ouvrir App Store Connect avec un compte membre autorisé de l’équipe Apple; ne jamais partager mot de passe ou code 2FA dans ce document.
2. Incrémenter le numéro de build, vérifier bundle, équipe et profils de signature puis compiler la source iOS correspondante au commit web testé.
3. Lancer les tests UI/XCTest sur un runner stable et exécuter le garde-fou de conformité avant téléversement.
4. Téléverser le nouvel IPA via Transporter ou Xcode Organizer et attendre le traitement Apple.
5. L’ajouter au groupe TestFlight externe souhaité et confirmer l’installation et les parcours avec un appareil de test.
6. Tester au minimum les comptes client et propriétaire, les commandes activées, le code de fidélité, les liens de parrainage, ainsi que l’iPad portrait/paysage.
7. Examiner les crashs et le dSYM Sentry, puis consigner les captures et résultats avant d’annoncer la mise à jour.

## 5. Objectif white-label — non équivalent à une fonctionnalité déjà livrée

Le workspace prend en charge des éléments d’identité de marque. Une offre white-label entièrement autonome par restaurant demande encore un pipeline contrôlé pour bundle IDs, icônes, configuration par tenant, certificats, fiches App Store/Google Play, paiements, intégrations et support. L’application Android cliente et l’automatisation de publication par client ne sont pas déclarées livrées ici.

Avant de vendre un déploiement client, valider l’isolation des tenants, les secrets côté serveur, le fonctionnement POS/Stripe réel, les droits légaux et les parcours de suppression/consentement sur les deux plateformes.

## 6. Livraison et tarification de commande

Les pages web exposent des parcours de menu, réservation et commande selon le restaurant. Une livraison façon marketplace, avec prix par distance/temps et paiement acheminé au compte propre du restaurant, ne doit pas être annoncée comme active sans un essai complet des zones, calculs serveur, paiement, POS, annulations, remboursements et notifications pour ce restaurant.
