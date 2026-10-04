# Règles UX et design visuel (référence de travail)

Deux jeux de règles fournis par le propriétaire du produit, à appliquer à toute interface (web et iOS). Les jetons du projet priment toujours sur les valeurs par défaut ci-dessous; en cas de conflit : lisibilité, accessibilité, motifs existants du projet, puis ces défauts. On ne les applique pas mécaniquement.

## 0. Jetons du projet (priment sur les défauts)

- Accent : émeraude `#167f5b` (foncé `#0e5a40`); un seul accent par vue.
- Neutres : crème `#f5f1e6` et `#fafaf5`, encre `#1b2620`, bordure `#e6e0d0`; palette sémantique native dans `native/ios/MinervaFlow/Sources/Theme.swift` (clair et sombre).
- Typographie : titres « New York » (repli Playfair Display), interface Plus Jakarta Sans, code JetBrains Mono. Le contraste éditorial serif/sans est voulu par le projet.
- Composants : `components/ui` et `components/minerva` (web); `CompteRowLabel`, `CompteGroup`, `CompteLink` (iOS, Compte).
- Marque : « Minerva Flow » (jamais « Flow par Minerva »).

## UX (20 principes, résumé)

1. Moins de choix par écran (Hick) · 2. Grandes cibles proches (Fitts) · 3. Motifs familiers (Jakob) · 4. Proximité pour grouper · 5. Découper en blocs (Miller) · 6. Réponse sous 400 ms (Doherty) · 7. Une action principale dominante (Von Restorff) · 8. Actions près du contenu · 9. L'essentiel en premier et en dernier (position sérielle) · 10. Finir sur un état clair (pic-fin) · 11. Progression visible (Zeigarnik) · 12. Simplicité visuelle (Prägnanz) · 13. Valeurs par défaut sûres · 14. Prévenir les erreurs (Postel) · 15. Erreurs récupérables · 16. Cohérence des motifs (similarité) · 17. Connexion visuelle des éléments liés · 18. Moins d'étapes (Parkinson) · 19. Complexité révélée graduellement (Tesler) · 20. Objectif qui se rapproche (gradient).

Exigences : identifier l'objectif, le plus court chemin, action suivante évidente, retour immédiat, erreurs prévenues et récupérables, achèvement confirmé.

## Design visuel (résumé chiffré)

- **Couleur** : un accent, neutres pour le reste, couleurs sémantiques réservées au statut; contraste texte ≥ 4,5:1 (grand texte et icônes ≥ 3:1); jamais la couleur seule; tout en jetons, clair et sombre.
- **Typographie** : une famille d'interface; échelle modulaire de ratio ≥ 1,25 (défaut 14, 16, 20, 25, 31, 39); corps ≥ 16; libellés ≥ 12; titre principal ≥ 2× le corps; trois graisses au plus; interligne corps ≥ 1,5; mesure 65–75 caractères; texte aligné à gauche; casse de phrase; majuscules seulement pour micro-libellés (12–13, espacement ≥ 0,05 em).
- **Espacement** : multiples de 8 (4 dans les composants compacts); échelle 4, 8, 16, 24, 32, 48, 64, 96; l'écart entre groupes ≥ 2× l'écart dans un groupe; bords gauches alignés.
- **Mise en page** : largeur de lecture ≤ 720 px, application ≤ 1280 px; une seule mise en page adaptative (640, 768, 1024, 1280); au plus un en-tête fixe et une barre d'action fixe.
- **Hiérarchie** : un élément dominant par vue; trois niveaux au plus; taille et graisse d'abord, puis espace, puis couleur.
- **Conteneurs** : séparer par l'espace d'abord; pas de carte pour chaque section; jamais de carte dans une carte; un rayon de composant et un rayon de conteneur; une ombre au plus; bordures de 1 px.
- **Boutons** : une action principale par vue (remplissage accent); secondaires en contour; libellés à l'infinitif ou verbe d'action (« Enregistrer les modifications »); hauteur 40 (48 sur tactile); cible minimale 44 × 44; une icône seule exige un libellé accessible.
- **États** : survol, focus visible (≥ 2 px, accent), actif, désactivé; chargement, vide, erreur, succès; les squelettes conservent la mise en page.
- **Icônes** : une seule bibliothèque; 16/20/24; pas d'emoji comme icône.
- **Formulaires** : libellés au-dessus et toujours visibles; une colonne; validation en ligne après la sortie du champ; messages d'erreur qui disent quoi faire; bouton d'envoi sous le dernier champ.
- **Tableaux** : nombres alignés à droite en chiffres tabulaires; pas de bordures verticales; états vides avec une action.
- **Mouvement** : 100–200 ms pour le retour, 200–300 ms pour la mise en page, jamais > 400 ms; respecter « réduire les animations »; pas d'animation au chargement.
- **Images et états vides** : ratio fixe et fond de remplacement; chaque liste a un état vide (une phrase, une action).
- **Accessibilité** : HTML sémantique, alternatives textuelles, étiquettes associées, clavier complet, test à 200 % de zoom.

## Passe de finition (avant de déclarer terminé)

1. Un seul accent à l'écran. 2. Cinq tailles de police distinctes ou moins. 3. Un seul bouton principal par vue. 4. Espacements sur l'échelle. 5. Chaque carte : l'espace seul suffirait-il ? 6. Chaque élément interactif a ses états. 7. Chaque élément asynchrone a chargement, vide, erreur. 8. Parcours au clavier avec focus visible. 9. À 375 px : rien ne déborde, l'action principale reste accessible. 10. Retirer tout ce qui n'aide pas l'action principale.
