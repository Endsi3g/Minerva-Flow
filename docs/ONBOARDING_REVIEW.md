# Revue de l'onboarding propriétaire (3 octobre 2026)

Objectif : que le parcours soit simple à terminer et ne fasse pas décrocher. Méthode : mesure sur la base (comptes de test et internes exclus), puis parcours réel à 375 px (téléphone) avec un compte neuf, avant et après modification.

## Ce que disent les chiffres

| Mesure | Valeur |
| --- | --- |
| Propriétaires inscrits (hors tests) | 24 |
| Onboarding terminé | 13 (54 %) ; sur les 30 derniers jours : 5 sur 15 (33 %) |
| Restaurant encore nommé « Mon restaurant » | 16 sur 24 : ils n'ont pas dépassé la première étape |
| Avec un menu publié | 3 |
| Avec au moins un client | **0** |

Le décrochage se produit à la première étape, et même ceux qui terminent n'obtiennent pas de client.

## Problèmes trouvés (parcours à 375 px)

| Étape | Avant | Problème |
| --- | --- | --- |
| 1 Profil | 5 décisions (nom, photo, type, nom du restaurant, **rôle**), page de 1044 px | Le rôle (4 cartes) n'a aucun sens pour la personne qui crée son propre compte : il occupait 40 % de l'écran |
| 2 Outils | Page de 1883 px, 12 contrôles | Instagram en double, publicité pour des campagnes payantes au milieu de la configuration, 8 connexions facultatives; l'action la plus utile (importer son menu) était enfouie |
| Navigation | « Plus tard » : 301 × 19 px, texte 12,5 px grisé | La sortie qui évite l'abandon était la plus difficile à toucher |
| Tailles | Boutons 36 px, champs 40 px, 9 tailles de texte dont 10,5 / 11 / 11,5 px | Sous les minimums de la grille de règles |
| Fin | Redirection immédiate vers `/workspace` | Aucun écran de fin, aucune prochaine étape (page vide observée en test local) |
| Après | La liste de démarrage ne parlait que de journées, d'adresse et d'outils | Aucune étape « publier le menu » ni « premier client », alors que 0 propriétaire a un client |

## Changements faits

- **Étape 1** : la question du rôle est retirée (la personne garde son rôle; les autres rôles viennent des invitations). Page de 812 px (un écran), champs et boutons de 48 px, « Continuer » pleine largeur.
- **Étape 2 « Mettez votre menu en ligne »** : l'import du menu en premier; les autres outils (Google Maps, Instagram, Facebook, caisse, QuickBooks) dans un bloc replié « Connecter d'autres outils ». Doublon et publicité retirés. 812 px replié, 1199 px déplié.
- **« Plus tard »** : bouton de 48 px, texte 14 px, contraste renforcé.
- **Échelle typographique** : 12 / 14 / 16 / 20 / 28 dans le parcours (rien sous 12 px).
- **Écran de fin** : « *Nom du restaurant* est prêt », ce qui est fait et ce qui reste (menu, QR, premiers clients), un bouton principal (« Ajouter mon menu » ou « Voir mon menu ») et un lien vers le tableau de bord.
- **Liste de démarrage** : « Publier votre menu » et « Inscrire votre premier client » en tête.
- **Panneau de connexion** : l'affirmation « 75 % à 100 % de revisite client » est remplacée par une phrase décrivant le produit (aucune mesure ne l'appuie).
- Test de bout en bout `e2e/onboarding.spec.ts` mis à jour pour le nouveau titre d'étape et l'écran de fin.

Mesures après (375 px) : étape 1 passe de 1044 à 812 px et de 12 à 8 contrôles; étape 2 de 1883 à 812 px (replié); aucun débordement horizontal; cibles principales à 48 px.

## À faire encore

1. **E-mails de cycle de vie des propriétaires** (bienvenue, activation, rappels, réactivation) : à vérifier qu'ils partent en production (0 événement e-mail enregistré en 30 jours).
2. **L'« activation » du moteur d'e-mails** repose sur les journées de service; l'aligner sur « menu publié » et « premier client ».
3. **Onboarding iOS** (propriétaire et client) : non revu dans cette passe.
4. **Étape 3** : le taux de points par dollar est une décision qu'un nouveau restaurateur ne sait pas prendre; la valeur par défaut (1) est raisonnable, envisager de masquer le champ derrière « Modifier ».
5. Mesurer à nouveau après quelques semaines : terminé / inscrits, nom changé / inscrits, premier client sous 14 jours.
