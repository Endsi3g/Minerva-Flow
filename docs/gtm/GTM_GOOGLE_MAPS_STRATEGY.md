# Minerva Flow — stratégie go-to-market locale

> **Document de travail — Montréal, 5 octobre 2026.** Cette version remplace la stratégie précédente, qui contenait des résultats non mesurés et des fonctions qui ne sont pas confirmées comme disponibles. Les chiffres présentés ci-dessous sont des objectifs d'expérience internes, jamais des résultats à annoncer.

## Positionnement

Minerva Flow aide les restaurants indépendants à faire revenir leurs clients avec des outils de fidélité, un menu en ligne et des parcours de commande directe lorsque le restaurant les a activés. Les équipes peuvent aussi suivre leur activité et gérer leur présence Google Business Profile selon les accès accordés.

La promesse à tester : **garder le lien avec les clients après leur première visite, dans un espace simple pour l'équipe du restaurant.** Ne pas promettre une hausse de revenus, de fréquentation, d'avis ou de classement Google sans mesure propre au restaurant et preuve vérifiable.

## Client idéal initial

- Restaurant indépendant ou petit groupe de restaurants à Montréal.
- Propriétaire ou gestionnaire impliqué dans la fidélité, le menu ou les commandes directes.
- Besoin concret identifié en entretien, par exemple retrouver les clients réguliers ou rendre le menu plus facile à partager.
- Capacité à fournir un restaurant de démonstration et un membre d'équipe pour un pilote.

Commencer dans un seul territoire permet de faire des démonstrations accompagnées, de comprendre l'onboarding et de documenter les objections avant d'élargir à Québec, Toronto ou Paris.

## Offre et parcours de vente

1. **Découverte** — entretien de 20 minutes sur le fonctionnement actuel du restaurant et son objectif prioritaire.
2. **Démonstration** — parcours web avec données fictives clairement signalées; montrer uniquement les fonctions disponibles et les intégrations réellement activées pour le restaurant.
3. **Pilote** — accompagner le restaurant jusqu'à une première valeur observable : menu publié, programme de fidélité configuré ou première commande directe, selon le besoin.
4. **Revue** — à 14 et 30 jours, examiner avec le client les inscriptions, les visites répétées et l'utilisation des parcours activés. Ne pas attribuer à Minerva Flow des résultats qui ne sont pas mesurés.
5. **Référence** — demander l'accord écrit du restaurant avant de publier son nom, ses chiffres ou son témoignage.

Les cibles d'expérimentation initiales sont **10 entretiens, 5 démonstrations et 3 pilotes accompagnés**. Ce sont des quotas de travail à ajuster après le premier cycle; ils ne décrivent aucun résultat déjà obtenu.

## Acquisition

- Prioriser les présentations par des restaurateurs, fournisseurs et associations locales, les visites en personne sur rendez-vous et les demandes entrantes.
- Utiliser les fiches publiques pour préparer une conversation manuelle et pertinente. Ne pas automatiser le scraping de Google Maps ni envoyer une campagne froide en masse.
- N'envoyer des courriels de prospection ou de mise à jour qu'aux destinataires pour lesquels le consentement ou une autre base applicable a été documenté. Pour les nouvelles produit, utiliser le segment Resend choisi à la main et explicitement inscrit; le dernier dossier indique 22 contacts, à recompter au moment de la campagne. Ne jamais reconstruire ce segment depuis les indicateurs en bloc de `profiles.product_updates_opt_in`.
- Garder les liens ambassadeurs cohérents avec le code et l'offre publiés : le dossier produit indique une commission de 10 % sur la première facture payée seulement; ne pas promettre une commission récurrente.

## Google Business Profile et avis

Positionner Google Business Profile comme un outil de gestion de présence et de réponse aux avis, pas comme une promesse de classement ou d'acquisition garantie.

Toute demande d'avis doit être identique et facultative pour tous les clients, sans demander une note précise. Ne pas filtrer les clients selon leur satisfaction avant de les diriger vers Google, décourager un avis négatif, ni offrir une récompense pour un avis. Google interdit explicitement la sollicitation sélective d'avis positifs et les incitatifs aux avis ([politique Google Business Profile](https://support.google.com/business/answer/7400114?hl=fr)).

Ne pas annoncer NFC, géorepérage, synchronisation POS en temps réel, délais d'activation, adoption, hausse de visites, classement Local Pack ou économies chiffrées sans validation de la capacité et des données concernées.

## Mesure du parcours

Les événements PostHog existants comprennent notamment `user_signed_up`, `onboarding_completed`, `restaurant_created`, `campaign_created` et `campaign_status_changed`. Ils mesurent l'inscription et une partie de l'activation, pas encore toute la valeur produit.

| Étape | Mesure à utiliser | État |
| --- | --- | --- |
| Acquisition | source du prospect, entretiens, démonstrations | À consigner dans le suivi commercial |
| Activation | inscription, restaurant créé, onboarding terminé | Événements PostHog déjà documentés |
| Première valeur | menu publié, fidélité configurée, première commande | Ajouter une instrumentation avant d'interpréter le taux d'activation |
| Rétention | retour hebdomadaire et activité du restaurant à 30 jours | Définir avec des cohortes réelles; aucune valeur cible historique fiable |
| Résultat restaurant | visites répétées, commandes directes, inscriptions fidélité | Mesurer par restaurant et période comparable; obtenir son accord avant publication |

Le CAC, la LTV, la conversion, la rétention et le gain de revenus restent à calculer à partir des données observées. Les ratios et pourcentages de l'ancienne version ne sont pas des preuves et ne doivent pas apparaître dans les campagnes ou les ventes.

## Plan des 90 premiers jours

### Jours 1 à 14 — apprendre

- Réaliser 10 entretiens à Montréal et documenter les problèmes avec les mots des restaurateurs.
- Faire 5 démonstrations accompagnées avec données d'exemple.
- Valider le parcours de la demande à la première action utile et consigner chaque abandon.

### Jours 15 à 45 — accompagner

- Lancer 3 pilotes avec un objectif choisi par chaque restaurant.
- Suivre chaque semaine l'usage des fonctions réellement activées.
- Corriger les points de friction prioritaires avant de lancer de la publicité payante.

### Jours 46 à 90 — prouver puis élargir

- Comparer les pilotes aux objectifs convenus; publier uniquement les cas approuvés par les clients.
- Décider si le positionnement, l'onboarding et le segment initial justifient un second territoire.
- Recalculer CAC et rétention avec coûts et cohortes réels avant tout objectif de croissance.

## Conditions avant campagne payante

- Un parcours de démonstration et d'activation validé avec des comptes isolés.
- Événements d'activation et de rétention fiables, avec les déclarations de confidentialité appropriées.
- Liste de prospection documentée, mécanisme de consentement et désabonnement vérifiés.
- Texte, captures et promesses limités au comportement effectivement disponible.
- Aucun message ne garantit des résultats financiers ou un classement Google.

Pour les envois électroniques, la loi canadienne anti-pourriel exige le consentement applicable avant l'envoi de messages électroniques commerciaux; conserver la preuve et offrir un mécanisme de désabonnement ([guide officiel sur le consentement](https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email)).
