# Partager les résultats (image et vidéo)

Deux écrans produisent un visuel ou une courte vidéo avec de vrais chiffres, prêts pour les réseaux sociaux.

| Écran | Qui | Chiffres |
| --- | --- | --- |
| `/campaigns/resultats` (Campagnes › Mes résultats) | Propriétaire ou gestionnaire du restaurant | Nouveaux membres, clients revenus, commandes servies, membres du programme, note moyenne. Période de 7, 30 ou 90 jours |
| `/equipe/partager` | Membres de l'équipe seulement (pas les ambassadeurs) | Restaurants avec menu en ligne, restaurants avec menu et clients, clients inscrits, commandes servies |

## Règles

- **Chiffres réels seulement, et seulement s'ils valent la peine d'être montrés.** Un zéro n'est jamais présenté comme un succès. Une note n'apparaît qu'à partir de 3 avis publics (`MIN_REVIEWS_FOR_RATING`). Règles dans `lib/share/results.ts`, testées dans `lib/__tests__/share-results.test.ts`.
- **L'utilisateur choisit** ce qu'il publie : chaque chiffre se décoche, le titre est modifiable, le pied de page « Minerva Flow · minervaflow.app » est facultatif.
- **Rien de financier.** Aucun revenu, abonnement, MRR, désabonnement ni objectif. Le nombre de « restaurants inscrits » est volontairement exclu du visuel Minerva : il est gonflé par des comptes par défaut et de test.
- Les comptes `is_demo` sont exclus des chiffres Minerva.
- **Agrégats uniquement** : aucun nom ni contact de client n'apparaît.
- La note moyenne ne « compte » pas de 0 à sa valeur dans l'animation : elle apparaît directement à sa vraie valeur.

## Formats

Story 1080×1920 et publication carrée 1080×1080, en trois thèmes de la marque (Forêt, Crème, Nuit). Export en PNG, en vidéo animée (environ 6 secondes, compte des chiffres puis image finale tenue 2 secondes), ou partage direct via le menu de partage du système quand le navigateur le permet.

La vidéo est créée dans le navigateur de l'utilisateur (`MediaRecorder` sur le canvas) : rien n'est envoyé à nos serveurs. MP4 H.264 quand le navigateur le permet (Safari, Chrome récent), sinon WebM. Si le navigateur ne sait pas enregistrer, le bouton est désactivé et le PNG reste disponible.

## Code

- Règles et animation : `lib/share/results.ts`. Rendu du canvas : `lib/share/draw-results.ts`. Enregistrement vidéo : `lib/share/record-video.ts`.
- Données : `lib/data/share-results.ts` (client service ; l'appelant vérifie le rôle).
- Interface : `components/share/ResultsShareStudio.tsx`.

## Vérifié et non vérifié

Vérifié dans un navigateur Chromium sans interface : rendu des 2 formats × 3 thèmes, image d'animation à mi-course, vidéo MP4 (H.264, 1080×1920, environ 6 s, début en cours de comptage, fin sur les valeurs exactes). Non vérifié : les pages elles-mêmes avec un compte connecté et de vraies données, la lecture sur Instagram/TikTok (ils ré-encodent), Safari iOS, l'enchaînement avec le menu de partage mobile.
