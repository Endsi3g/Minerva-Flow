# Brief de copywriting — Page d'accueil publique (`/`)

Ce document remplace la page d'accueil marketing qui existait à `/` (retirée le
15 juillet 2026, faute d'être utilisée). Il sert de brief pour rédiger — ou
faire rédiger — un vrai texte avant de reconstruire la page. Le code de
référence (structure, composants) reste disponible dans l'historique git au
commit `3cb8046` si on veut repartir de cette base plutôt que de zéro.

## 1. Ce qu'est le produit

Minerva Flow est un cockpit de gestion pour restaurants et cafés indépendants
ou petites chaînes (2 à 5 établissements) : suivi du revenu quotidien,
campagnes marketing, gestion d'équipe, assistant IA, rapports partageables.

## 2. Client cible — à qui on parle

- Propriétaires de restaurant/café indépendant, ou de petites chaînes
  locales (2-5 établissements).
- Basés au Québec — le produit et son ton sont pensés pour ce marché
  spécifiquement (fuseau horaire, Loi 25, français québécois), pas un
  Québec générique traduit de l'anglais.
- Souvent 30-50 ans, pas nécessairement à l'aise avec la technologie — le
  produit doit se vendre sur la simplicité, pas sur les fonctionnalités.
- Remplacent aujourd'hui soit un classeur Excel/Google Sheets fait maison,
  soit un autre logiciel de gestion (Square, Toast, etc.) qui ne leur donne
  pas de vraie visibilité sur leurs tendances.
- Ils n'ont **pas** de temps à perdre en configuration — s'ils ne voient pas
  de valeur dans les 5 premières minutes, ils repartent.

## 3. Proposition de valeur — le seul message qui compte

**Minerva Flow leur dit ce qui se passe dans leur restaurant avant qu'ils
aient à le deviner** — pas juste un tableau de chiffres, une lecture de ce
qui compte, formulée simplement.

Ne pas vendre : "un logiciel de gestion complet avec 40 fonctionnalités."
Vendre : "vous savez enfin pourquoi votre mercredi est mort, sans sortir la
calculatrice."

## 4. Ton et voix

- Vouvoiement, français québécois professionnel mais chaleureux — jamais de
  jargon SaaS ("synergie", "scalable", "disruptif").
- Phrases courtes. Concret plutôt qu'abstrait : "trente secondes" plutôt que
  "rapide", "votre mercredi" plutôt que "vos données."
- Aucune promesse de gain chiffré non vérifiable ("augmentez vos profits de
  30%") — le produit donne de la visibilité, pas des miracles.
- S'adresser à UNE personne (le propriétaire), pas à "les entreprises."

## 5. Ce qui est réellement livré aujourd'hui (à ne mettre en avant que si vrai)

Vérifier l'état du produit avant d'écrire — certaines pièces sont des
scaffolds techniques, pas des fonctionnalités activées :

- ✅ **Réel et fonctionnel** : suivi de revenu quotidien, import CSV
  d'historique, assistant IA conversationnel, rapports partageables par
  lien, invitations d'équipe par lien, suivi des employés et revues de
  performance, revue de performance automatique par IA.
- ⚠️ **Construit mais pas branché** (nécessite un compte externe côté
  Minerva avant d'être réellement actif) : facturation Stripe, connexion
  Square, banque ouverte. **Ne pas promettre ces intégrations comme
  disponibles tant qu'elles n'ont pas été activées et testées.**
- ❌ **N'existe pas** : application mobile native (c'est une PWA), support
  multi-langue, intégration Lightspeed/Clover.

## 6. Structure de page recommandée

1. **Hero** — une phrase qui nomme le problème concret (pas l'outil), un
   CTA principal ("Demander un accès" ou équivalent selon le statut du
   programme pilote au moment de la rédaction), un CTA secondaire discret
   ("J'ai déjà un compte").
2. **Le problème, en une image** — la scène familière : classeur Excel,
   chiffres découverts trop tard, temps perdu en fin de soirée à tout
   compiler.
3. **3-4 preuves concrètes** — pas une liste de fonctionnalités, des
   scénarios : "vous voyez que le mercredi est systématiquement faible",
   "vous invitez votre équipe en un lien, pas un mot de passe par
   courriel."
4. **Comment ça démarre** — 3 étapes max, en insistant sur la vitesse
   (configuration, import de l'historique, invitation de l'équipe).
5. **Un mot sur la confidentialité** — cible non technique = inquiète pour
   ses données. Une phrase rassurante + lien vers `/legal/privacy`.
6. **CTA final** — reprendre l'appel à l'action du hero.
7. **Pied de page** — liens `/legal/terms` et `/legal/privacy` (obligatoire
   légalement, voir section 8).

## 7. Objections à lever explicitement dans le texte

- « Je ne suis pas informaticien » → insister sur le temps de configuration
  (5 minutes), pas sur la puissance technique.
- « J'ai déjà des années de données ailleurs » → mentionner l'import
  CSV/Excel de l'historique.
- « Combien ça coûte » → si le programme est encore en phase pilote
  gratuite au moment de la rédaction, le dire clairement plutôt que
  laisser un flou anxiogène.
- « Mes données vont où » → une phrase simple, lien vers la politique de
  confidentialité, mention du Québec/Loi 25 si pertinent pour rassurer.

## 8. Obligations légales — non négociable

La page doit toujours lier `/legal/terms` (Conditions d'utilisation) et
`/legal/privacy` (Politique de confidentialité) dans le pied de page, comme
c'est déjà le cas sur les pages de connexion et d'inscription. Ces deux
pages existent déjà dans l'app et n'ont pas besoin d'être recréées.

## 9. Brouillon existant (non retenu, à réutiliser ou jeter)

Un premier jet de copy existait dans la version retirée — hero centré sur
« Le cockpit de revenus pour votre restaurant, sans devenir comptable », 4
sections features, 3 étapes de démarrage, section programme pilote avec
formulaire de demande d'accès (`components/marketing/PilotRequestForm.tsx`,
conservé et toujours fonctionnel — relié à `/admin/pilots`). Ce texte n'a
jamais été validé par un humain ni testé — à considérer comme un point de
départ jetable, pas une version approuvée.
