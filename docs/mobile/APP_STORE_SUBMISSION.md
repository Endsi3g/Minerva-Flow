# Publier l'app sur l'App Store (liste de départ)

Pourquoi : aujourd'hui l'app n'existe que par TestFlight (lien public, builds de 90 jours, installation en deux temps, plafond de testeurs). La stratégie « le client installe l'app pour obtenir ses récompenses » demande l'App Store.

## Ce qui est prêt (vérifié)

- Audit de conformité (`app-store-compliance-guard.sh native/ios`) : 0 critique, 0 élevé, 1 avertissement manuel (compte de démo, fiche App Store, déclarations de confidentialité et notes/accords d'examen à compléter).
- Politique de confidentialité publique (`/legal/privacy`) et lien dans l'app (Aide).
- Suppression de compte dans l'app (Compte › Sécurité).
- Connexion avec Apple proposée à côté de Google (exigence de l'App Store quand un autre service de connexion existe).
- Paiement en ligne et versements : l'app ouvre le web; aucun SDK de paiement.
- Texte dynamique, « Réduire les animations », français et anglais.

## À faire (par vous, dans App Store Connect et le portail Apple)

1. **Capacité NFC** : le build TestFlight `1.0.1 (19)` est préparé sans NFC : l'entitlement et l'usage-description sont absents et l'interface NFC est masquée. Pour l'activer dans une release future, activer la capacité sur `com.minervaflow.loyalty`, régénérer les profils et rétablir le réglage documenté dans `NFC_AND_SIGNING.md`.
2. **Compte de démonstration pour l'examen Apple** : un compte client et un compte propriétaire dans « Informations de l'examen ». Les identifiants se saisissent dans App Store Connect, jamais dans le dépôt.
3. **Fiche de l'app** : nom, sous-titre, description française et anglaise, mots-clés, catégorie (Cuisine et boissons ou Style de vie), URL d'assistance, URL de la politique de confidentialité, captures d'écran iPhone (tailles exigées par Apple).
4. **Étiquettes de confidentialité** : courriel, nom, identifiant, historique d'achats et de points, jetons de notification.
5. **Classification d'âge** : répondre au nouveau questionnaire.
6. **Chiffrement** : `ITSAppUsesNonExemptEncryption` est déclaré dans le projet; confirmer la réponse à la question d'exportation.
7. **Serveur de production sain** avant l'examen : sans la clé serveur de production, le menu, les noms de restaurants et la carte sont vides, et l'examinateur le verra.
8. Choisir la version et le numéro de build, téléverser, puis « Soumettre pour examen ».

## État du build 1.0.1 (19) — 6 octobre 2026

- Archive signée `Apple Distribution` construite localement et téléversée avec succès; App Store Connect indique que le paquet est en traitement. Le build Debug 19 est installé et lancé sur l'iPhone 13.
- La migration Supabase `0179_resolve_restaurant_connection_token` est appliquée en Production. Le compte de démonstration existant a des adhésions; le nouvel onboarding QR d'un compte sans adhésion demeure à valider.
- L'audit automatique ne relève aucun risque critique ou élevé, mais conserve un avertissement de contrôles manuels App Store. Ce résultat n'est pas une approbation de soumission.

## Espace propriétaire de l'app : compte

- Déconnexion : Gestion > Paramètres > Compte, avec confirmation.
- Suppression de compte **dans l'app** (feuille avec saisie de « SUPPRIMER ») et lien vers la page de profil web. Les deux passent par la même règle serveur (`deleteAccountForUser`, route `DELETE /api/owner/account`) : le seul propriétaire d'un établissement doit d'abord le transférer, sinon la suppression est refusée avec un message (409).
- Vérifier le parcours réel de suppression en production avec un compte de test, notamment les exigences de transfert lorsqu'un compte est seul propriétaire d'un établissement.
- Corrigé au passage : un propriétaire dont le restaurant n'a pas de `workspace_id` (cas de la démo) retombait silencieusement dans l'espace client, car le modèle natif exigeait ce champ.

## Points moyens restants de l'audit automatique

- Polices à taille fixe : corrigé par le texte dynamique (à relancer pour confirmer).
- « Réduire les animations » : traité au niveau racine.
- Questionnaire d'âge 2026 : à remplir dans App Store Connect.
