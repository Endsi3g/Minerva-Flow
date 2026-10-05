import { BlogPost } from "./types";

/**
 * Editorial rules for every article here:
 * - no statistic without a named source, no invented case study, no quote from a person who did not say it;
 * - worked numbers are labelled as examples;
 * - only describe what Minerva Flow does today (see docs/private/REQUIS_A_Z.md for what is and is not live).
 */
export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: "post-01-return-rate",
    slug: "mesurer-fidelite-restaurant-taux-de-retour",
    title: "Mesurer la fidélité de vos clients : le taux de retour à 30 jours",
    description:
      "Un seul chiffre dit si vos clients reviennent : le taux de retour. Comment le définir, le calculer avec ou sans logiciel, et quoi faire quand il est bas.",
    category: "Fidélisation & Croissance",
    coverImage: "/revenue-vs-marge.png",
    authorName: "Équipe Minerva Flow",
    authorRole: "Fidélisation",
    readTimeMinutes: 6,
    publishedAt: "2026-10-05T08:00:00.000Z",
    isPublished: true,
    featured: true,
    tags: ["Fidélisation", "Taux de retour", "Indicateurs", "Restaurant", "Café"],
    seoTitle: "Taux de retour client en restauration : définition et calcul | Minerva Flow",
    seoDescription:
      "Définition du taux de retour à 30 jours, formule, exemple chiffré et pistes d'action pour un restaurant ou un café.",
    keyTakeaways: [
      "Le taux de retour compte les nouveaux clients qui reviennent au moins une fois dans une fenêtre choisie (30 jours est un bon début).",
      "Sans identifier le client (téléphone ou courriel), il est impossible de le mesurer : une carte anonyme ne suffit pas.",
      "Comparez votre chiffre à vous-même d'un mois à l'autre plutôt qu'à une moyenne trouvée en ligne.",
      "Une récompense dès la deuxième visite est la façon la plus simple de faire monter le chiffre.",
    ],
    content: `
### Pourquoi un seul chiffre

Une caisse pleine un samedi ne dit pas si ces clients reviendront. Le **taux de retour** répond à cette question : parmi les personnes venues pour la première fois, combien reviennent ?

---

### La définition

> **Taux de retour à 30 jours** = nouveaux clients qui reviennent au moins une fois dans les 30 jours suivant leur première visite ÷ nouveaux clients de la période × 100

Choisissez une fenêtre qui correspond à votre rythme : 14 jours pour un café du matin, 30 jours pour un restaurant de quartier, plus longue pour une table gastronomique. L'important est de garder **la même fenêtre** pour comparer.

---

### Un exemple chiffré (fictif)

Un café accueille 80 nouveaux clients identifiés en septembre. 28 reviennent dans les 30 jours suivant leur première visite.

> 28 ÷ 80 × 100 = **35 %**

Ce 35 % n'est ni bon ni mauvais en soi. Il devient utile le mois suivant : s'il passe à 40 %, ce que vous avez changé fonctionne.

---

### Comment le mesurer

1. **Identifier le client.** Le numéro de téléphone fonctionne bien au comptoir ; le courriel convient pour les commandes en ligne. Sans cela, vous comptez des visites, pas des clients.
2. **Noter la première visite.** Un logiciel de fidélité le fait à la création de la carte. À la main, un tableur avec la date de première visite suffit pour démarrer.
3. **Compter les retours dans la fenêtre.** Une deuxième visite le même jour ne compte pas.
4. **Calculer chaque mois**, toujours de la même façon.

Dans Minerva Flow, le tableau de bord de l'aperçu affiche un taux de retour et le nombre d'habitués actifs à partir des visites enregistrées.

---

### Quand le chiffre est bas

- **Donnez une raison de revenir dès la deuxième visite.** Une première récompense proche (un café offert au bout de quelques visites) vaut mieux qu'un grand cadeau lointain.
- **Relancez avec mesure.** Un message après deux à trois semaines sans visite peut suffire, à condition que le client ait consenti à le recevoir. Au Canada, la Loi canadienne anti-pourriel (LCAP) exige un consentement.
- **Regardez l'expérience.** Un retour bas vient parfois d'une attente trop longue ou d'un accueil, pas d'un manque de récompenses.

---

### À retenir

Mesurez un chiffre simple, au même rythme, pour les mêmes clients. Le but n'est pas d'atteindre une moyenne du secteur, mais de voir votre propre courbe monter.
`,
  },
  {
    id: "post-02-pos-and-loyalty",
    slug: "caisse-et-fidelite-ce-quil-faut-savoir",
    title: "Caisse et programme de fidélité : ce qu'il faut savoir avant de les relier",
    description:
      "Relier sa caisse à un programme de fidélité évite la double saisie. Les trois situations possibles, et la liste de questions à poser avant de signer.",
    category: "Technologies & POS",
    coverImage: "/demo.png",
    authorName: "Équipe Minerva Flow",
    authorRole: "Intégrations & caisses",
    readTimeMinutes: 5,
    publishedAt: "2026-10-05T09:00:00.000Z",
    isPublished: true,
    featured: false,
    tags: ["Caisse", "Square", "Lightspeed", "Clover", "Toast", "Fidélité"],
    seoTitle: "Relier sa caisse à un programme de fidélité : le guide | Minerva Flow",
    seoDescription:
      "Caisse connectée ou non : comment créditer les points de fidélité, et les questions à poser à son fournisseur avant de relier Square, Lightspeed, Clover ou Toast.",
    keyTakeaways: [
      "Une caisse connectée crédite les points à l'encaissement ; sans connexion, le comptoir peut les créditer en identifiant le client.",
      "La connexion demande l'autorisation du commerçant chez le fournisseur de la caisse : prévoyez un peu de temps et vos accès.",
      "Posez toujours trois questions : qui voit les données, que se passe-t-il si la connexion tombe, et comment sortir du service.",
    ],
    content: `
### Le problème de la double saisie

Si le personnel doit encaisser sur un écran puis créditer la fidélité sur un autre, le coup de feu ralentit et les oublis s'accumulent. Relier la caisse au programme règle ce problème, mais ce n'est pas toujours possible tout de suite.

---

### Les trois situations

#### 1. La caisse est connectée
Chaque vente réglée crédite les points du client, sans geste de l'équipe. Minerva Flow est conçu pour fonctionner avec **Square, Lightspeed, Clover et Toast**. La connexion se fait avec l'autorisation du commerçant chez le fournisseur de la caisse : c'est vous qui la donnez, nous ne l'obtenons jamais à votre place.

#### 2. La caisse n'est pas connectée
Le comptoir crédite lui-même. Le personnel cherche le client par son numéro de téléphone, puis lui demande le **code à 6 chiffres** affiché dans son application (il change toutes les cinq minutes) pour confirmer qu'il s'agit bien de lui. Il saisit ensuite le montant de l'achat et les points sont calculés selon vos réglages. C'est une étape de plus par client : à l'heure de pointe, elle se sent.

#### 3. Une caisse ancienne, sans accès pour les logiciels tiers
Certaines caisses ne permettent aucune connexion. La situation 2 s'applique, ou un changement de caisse devient à envisager.

---

### Les questions à poser avant de relier quoi que ce soit

1. **Qui voit les données de mes clients ?** Un fournisseur doit pouvoir répondre simplement, et respecter la Loi 25 sur la protection des renseignements personnels.
2. **Que se passe-t-il si la connexion tombe ?** Le service doit continuer à encaisser, et les points manquants doivent pouvoir être rattrapés.
3. **Puis-je sortir ?** Récupérer ses données et couper l'accès doit rester possible.
4. **Qui paie quoi ?** Certaines caisses facturent l'accès à leurs interfaces : vérifiez votre contrat.

---

### Une note sur les reçus et la taxation

Votre caisse certifiée reste celle qui émet le reçu officiel. Un programme de fidélité ne s'y substitue pas : il lit les ventes, il ne les remplace pas.
`,
  },
  {
    id: "post-03-card-formats",
    slug: "carte-fidelite-papier-wallet-ou-application",
    title: "Carte de fidélité : carton, portefeuille du téléphone ou application ?",
    description:
      "Comparaison honnête des trois formes de carte de fidélité pour un restaurant ou un café : ce que chacune fait bien, et ce qu'elle ne fait pas.",
    category: "Fidélisation & Croissance",
    coverImage: "/og.png",
    authorName: "Équipe Minerva Flow",
    authorRole: "Expérience client",
    readTimeMinutes: 5,
    publishedAt: "2026-10-05T10:00:00.000Z",
    isPublished: true,
    featured: false,
    tags: ["Apple Wallet", "Google Wallet", "Application mobile", "Carton", "Fidélité"],
    seoTitle: "Carte de fidélité restaurant : carton, Wallet ou application ? | Minerva Flow",
    seoDescription:
      "Carton, Apple Wallet, Google Wallet ou application : avantages, limites et choix selon votre établissement.",
    keyTakeaways: [
      "Le carton ne coûte rien mais ne dit rien sur le client : pas de nom, pas de relance possible.",
      "Une carte dans le portefeuille du téléphone s'ajoute vite, mais elle affiche un solde qui n'est pas mis à jour en direct.",
      "Une application montre le solde à jour et les récompenses, au prix d'une installation : il faut une bonne raison de la faire.",
      "Le choix n'est pas exclusif : plusieurs formes peuvent coexister pour un même client.",
    ],
    content: `
### Trois formes, trois compromis

#### Le carton à tamponner
- **Pour** : aucun coût, aucune technologie, tout le monde comprend.
- **Contre** : vous ne savez pas qui est le client, vous ne pouvez pas le relancer, et un carton oublié à la maison est une récompense perdue (ou un café offert sur parole).

#### La carte dans le portefeuille du téléphone (Apple Wallet, Google Wallet)
- **Pour** : le client n'installe rien, la carte se range près de sa carte bancaire, et elle s'ajoute en quelques secondes depuis un QR code.
- **Contre** : le solde affiché dans la carte est celui du moment où elle a été ajoutée ; il ne se met pas à jour en direct. Pour le solde à jour, le client regarde l'application ou demande au comptoir.
- **Au comptoir** : le client donne son numéro de téléphone, que le code de la carte contient.

#### L'application
- **Pour** : solde et récompenses à jour, offres, parrainage, commande, et la possibilité d'offrir un bonus d'installation.
- **Contre** : il faut l'installer et se connecter. Sans raison claire (un bonus, des récompenses qui s'y trouvent), beaucoup de clients ne le feront pas.

---

### Comment choisir

| Votre situation | Piste |
| :--- | :--- |
| Café de passage, clients pressés | Wallet, avec le téléphone au comptoir |
| Clients réguliers et récompenses variées | Application avec un bonus d'installation |
| Aucune technologie pour l'instant | Carton, mais notez le téléphone du client pour pouvoir le mesurer |

Minerva Flow propose la carte dans le portefeuille (Apple Wallet et Google Wallet) et une application, avec les mêmes données.

---

### Une règle qui vaut pour les trois

Quelle que soit la forme, **demandez le consentement** avant d'envoyer des messages promotionnels : la Loi canadienne anti-pourriel (LCAP) l'exige, et un client qui a accepté lit vos messages.
`,
  },
  {
    id: "post-04-prime-cost",
    slug: "calcul-prime-cost-restauration-guide-formule",
    title: "Calculer son Prime Cost : la formule et comment la lire",
    description:
      "Nourriture, boissons et salaires : le Prime Cost est l'indicateur que beaucoup d'exploitants surveillent chaque semaine. Formule, exemple et repères.",
    category: "Rentabilité & Prime Cost",
    coverImage: "/auth-restaurant-bg.jpg",
    authorName: "Équipe Minerva Flow",
    authorRole: "Gestion & marges",
    readTimeMinutes: 6,
    publishedAt: "2026-10-05T11:00:00.000Z",
    isPublished: true,
    featured: false,
    tags: ["Prime Cost", "Coût des aliments", "Masse salariale", "Rentabilité"],
    seoTitle: "Calcul du Prime Cost en restauration : formule et repères | Minerva Flow",
    seoDescription:
      "Formule du Prime Cost (coût des aliments et boissons + masse salariale), exemple chiffré fictif et façon de lire le résultat.",
    keyTakeaways: [
      "Prime Cost = coût des aliments et boissons + masse salariale, divisé par les ventes nettes avant taxes.",
      "Les repères souvent cités se situent autour de 60 % à 65 % des ventes, mais ils varient selon le concept.",
      "Suivez le chiffre chaque semaine : un mois de retard cache un problème qu'on aurait pu corriger.",
    ],
    content: `
### Un chiffre qui dépend de vos décisions

Le loyer et les assurances changent peu. Deux dépenses changent chaque semaine : ce que vous achetez pour les assiettes et les verres, et les heures de votre équipe. Le **Prime Cost** les additionne.

---

### La formule

> **Prime Cost ($)** = coût des aliments et boissons + masse salariale
> **Prime Cost (%)** = Prime Cost ($) ÷ ventes nettes avant taxes × 100

**Aliments et boissons** : achats de la période, ajustés des stocks (stock de début + achats − stock de fin), emballages à emporter compris.
**Masse salariale** : heures payées en cuisine et en salle, plus les charges sociales obligatoires.

---

### Un exemple chiffré (fictif)

Sur une semaine : ventes nettes de 12 000 $, aliments et boissons de 3 800 $, masse salariale de 3 700 $.

> (3 800 + 3 700) ÷ 12 000 × 100 = **62,5 %**

---

### Comment le lire

Il n'existe pas de bonne valeur universelle. Les repères le plus souvent cités pour un restaurant à service complet se situent autour de **60 % à 65 %** des ventes nettes ; un comptoir ou un café peut viser plus bas, une table gastronomique plus haut. Trois lectures utiles :

1. **Comparez-vous à vous-même** : même semaine, même méthode, d'un mois à l'autre.
2. **Séparez les deux moitiés.** Si le total monte, regardez d'abord laquelle bouge : aliments (gaspillage, portions, prix des fournisseurs) ou salaires (plannings trop chargés en heures creuses).
3. **Rapprochez-le des ventes.** Un Prime Cost qui monte avec des ventes qui baissent n'a pas la même cause qu'un Prime Cost qui monte avec des ventes stables.

---

### À quel rythme le suivre

Chaque semaine suffit. Attendre le bilan du comptable trois mois plus tard laisse le problème grossir. Le tableau de bord de Minerva Flow regroupe vos ventes et votre masse salariale pour faciliter ce suivi.
`,
  },
  {
    id: "post-05-google-maps",
    slug: "google-maps-restaurant-fiche-et-avis",
    title: "Google Maps : soigner sa fiche et recueillir des avis, sans tricher",
    description:
      "Une fiche Google complète et des avis récents aident à être trouvé. Les gestes simples, et ce que la politique de Google interdit.",
    category: "Google Maps & E-Réputation",
    coverImage: "/og.png",
    authorName: "Équipe Minerva Flow",
    authorRole: "Visibilité locale",
    readTimeMinutes: 5,
    publishedAt: "2026-10-05T12:00:00.000Z",
    isPublished: true,
    featured: false,
    tags: ["Google Maps", "Avis clients", "Visibilité locale", "Restaurant"],
    seoTitle: "Google Maps pour un restaurant : fiche et avis | Minerva Flow",
    seoDescription:
      "Comment compléter sa fiche d'établissement Google, recueillir des avis honnêtes et répondre aux critiques, dans le respect des règles de Google.",
    keyTakeaways: [
      "Une fiche complète (heures, photos, menu, téléphone) répond aux questions des clients avant qu'ils ne les posent.",
      "Invitez tous vos clients à laisser un avis : Google interdit de ne solliciter que les clients satisfaits.",
      "Répondez à chaque avis, y compris aux critiques, calmement et sans détails personnels.",
      "Un lien de commande directe vous évite les frais d'une plateforme tierce ; vérifiez ses conditions dans votre contrat.",
    ],
    content: `
### Où les clients vous trouvent

Beaucoup de gens cherchent « café près de moi » ou « brunch Montréal » dans Google Maps. Votre fiche est alors votre vitrine, avant même que le client vous connaisse.

---

### Soigner la fiche

- **Les bases exactes** : adresse, heures (y compris les jours fériés), téléphone, site.
- **Des photos récentes** : la salle, le comptoir, quelques plats. Elles rassurent plus qu'un texte.
- **Le menu et un lien d'action** : un lien vers votre commande ou votre réservation directe plutôt qu'une plateforme tierce, dont la commission dépend de votre forfait.
- **Une description courte** qui dit ce que vous êtes, sans slogans.

---

### Recueillir des avis, honnêtement

Les avis récents et nombreux comptent pour les clients et pour Google. Pour en obtenir :

1. **Demandez à tout le monde**, au bon moment : après un bon service, à la caisse, avec un QR code qui ouvre directement la page d'avis.
2. **Ne triez pas.** La politique de Google interdit de solliciter des avis seulement auprès des clients satisfaits, et d'offrir une récompense en échange d'un avis. Vous pouvez en plus offrir un canal privé pour les commentaires, mais pas en détourner les avis négatifs du public.
3. **Répondez à chaque avis.** Remerciez pour les bons, et pour les critiques : reconnaissez, proposez un geste ou un contact, sans entrer dans les détails d'un client.

---

### Ce que Minerva Flow ajoute

La section Réputation de Minerva Flow regroupe les avis et vous aide à ne pas en laisser sans réponse. Elle ne remplace pas la politique de Google : les avis publics se laissent sur Google.

---

### À retenir

Une fiche exacte, des photos récentes, des avis demandés à tous et des réponses calmes : rien de spectaculaire, mais c'est ce qui se cumule dans le temps.
`,
  },
];
