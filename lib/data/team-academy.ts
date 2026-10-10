
/**
 * Académie — formation interne (équipe + ambassadeurs). Une seule source de
 * contenu pour le web (/equipe/academie) et le natif (/api/team/academy).
 *
 * Règle d'honnêteté : chaque affirmation chiffrée porte une étiquette.
 *  - vérifié : constaté dans le code, la base ou un rapport de livraison
 *  - hypothèse : pari stratégique non encore prouvé
 *  - cible : objectif visé, pas un résultat
 *  - à confirmer : donnée sans source ou décision à prendre
 * Les sections `teamOnly` (chiffres internes, cibles) ne sont jamais servies
 * aux ambassadeurs.
 */

export type AcademyTag = "vérifié" | "hypothèse" | "cible" | "à confirmer";

export type AcademyItem = { text: string; tag?: AcademyTag };

export type AcademySection = {
  id: string;
  title: string;
  intro?: string;
  items?: AcademyItem[];
  note?: { tone: "info" | "warn"; text: string };
  teamOnly?: boolean;
};

export type AcademyPage = {
  slug: "produit" | "gtm";
  title: string;
  description: string;
  sections: AcademySection[];
};


const PRODUCT_PAGE: AcademyPage = {
  slug: "produit",
  title: "Le produit aujourd’hui",
  description: "Ce que Minerva Flow fait, où on en est, et ce qu’il ne faut pas promettre.",
  sections: [
    {
      id: "quoi",
      title: "Ce que fait Minerva Flow",
      intro:
        "Minerva Flow relie l’exploitation d’un restaurant à la relation avec ses clients. Le restaurateur pilote ses marges, son menu, ses commandes et sa fidélisation depuis le web ou l’app iOS ; le client découvre le restaurant, utilise sa carte de fidélité et peut commander là où c’est activé.",
      items: [
        { text: "Ce n’est pas un système de caisse universel : les ventes et paiements dépendent des intégrations réellement connectées.", tag: "vérifié" },
      ],
    },
    {
      id: "etat",
      title: "Où on en est",
      items: [
        { text: "Web : version 2.50.0 en production depuis le 29 septembre 2026 (recommandations explicables, qualité des données).", tag: "vérifié" },
        { text: "iOS : build 1.0.0 (15) approuvé pour les testeurs externes TestFlight (état au 27 septembre). Aucun test d’installation sur iPhone physique n’est documenté.", tag: "vérifié" },
        { text: "Modules livrés : Flow AI, Menu et Flow Direct (menu partageable, QR, commandes suivies), Fidélisation (points, récompenses, parrainage), Campagnes, Inventaire et fournisseurs, Réservations, Ambassadeurs et UGC, Google Business Profile.", tag: "vérifié" },
        { text: "Espace propriétaire iOS compatible iPad ; espace équipe et ambassadeurs (celui-ci) sur web et natif.", tag: "vérifié" },
      ],
    },
    {
      id: "forfaits",
      title: "Modèle à la performance",
      intro: "Aucun forfait ni prix publié. Minerva est rémunérée par un pourcentage des revenus additionnels mesurés, convenu par écrit avec chaque restaurant.",
      items: [
        { text: "Période de développement : accès gratuit, sans carte de crédit. Avant toute facturation, un avis écrit d’au moins 30 jours et l’acceptation expresse du restaurant.", tag: "vérifié" },
        { text: "S’il n’y a aucun revenu additionnel mesuré pour un mois, rien n’est dû.", tag: "vérifié" },
        { text: "Ne jamais promettre un résultat : dire « jusqu’à 5 à 10 % de revenus selon le panier », jamais une moyenne.", tag: "vérifié" },
      ],
    },
    {
      id: "ambassadeurs",
      title: "Programme ambassadeur",
      items: [
        { text: "Commission de 10 % sur la première facture d’abonnement payée d’un restaurant recommandé via votre lien.", tag: "vérifié" },
        { text: "Elle devient payable après 30 jours, sous réserve d’annulation ou de remboursement ; versement par Stripe après vérification d’identité.", tag: "vérifié" },
        { text: "Contenu (UGC) : seuls les restaurants qui ont accepté de participer peuvent apparaître ; chaque publication est vérifiée avant réutilisation et doit mentionner votre relation commerciale (#MinervaFlow).", tag: "vérifié" },
      ],
    },
    {
      id: "ne-pas-promettre",
      title: "Ce qu’il ne faut pas promettre",
      items: [
        { text: "Pas de remplacement de la caisse du restaurant.", tag: "vérifié" },
        { text: "Pas de paiement en ligne des commandes tant que le restaurant n’a pas activé et vérifié son compte de paiement.", tag: "vérifié" },
        { text: "Pas de résultats clients chiffrés (augmentation de visites, de chiffre d’affaires) : aucun n’est encore mesuré chez un restaurant payant.", tag: "vérifié" },
        { text: "Pas de synchronisation de caisse « automatique pour tous » : elle dépend de l’intégration connectée (Square, Lightspeed, Clover…).", tag: "vérifié" },
      ],
    },
    {
      id: "etat-chiffre",
      title: "État chiffré (interne)",
      teamOnly: true,
      items: [
        { text: "Les restaurants de démo et de test sont marqués et exclus de tous les chiffres du tableau de bord. Un compte interne non marqué compte comme un restaurant réel.", tag: "vérifié" },
        { text: "0 abonnement payant : la facturation n’est pas activée, donc MRR à 0 $. Décision des fondateurs, pas un blocage.", tag: "vérifié" },
        { text: "Paiement en ligne des commandes (Stripe Connect) désactivé en production.", tag: "vérifié" },
        { text: "Pilote en cours : Mains Magique (épicerie, caisse Clover). Catalogue saisi à la main ; la connexion Clover attend le propriétaire du compte.", tag: "vérifié" },
      ],
    },
  ],
};

const GTM_PAGE: AcademyPage = {
  slug: "gtm",
  title: "Marché et go-to-market",
  description: "Comment on trouve, convainc et garde nos restaurants — de A à Z. Version 1, à corriger par l’équipe.",
  sections: [
    {
      id: "these",
      title: "La thèse",
      intro:
        "Google Maps amène les clients mais ne les retient pas : une fois l’addition payée, le restaurant ne peut plus les recontacter. Minerva Flow capture le client sur place (QR, puis NFC), le fidélise dans son téléphone et transforme les visites satisfaites en avis publics.",
      items: [
        { text: "Plus de 70 % des consommateurs choisissent un restaurant avec Google Maps.", tag: "à confirmer" },
        { text: "Les plateformes de livraison prélèvent 25 à 30 % de commission par commande.", tag: "à confirmer" },
        { text: "Le Google Business Profile se connecte déjà à l’app pour suivre fiche et avis.", tag: "vérifié" },
      ],
    },
    {
      id: "icp",
      title: "Le client idéal",
      items: [
        { text: "Restaurants, cafés et épiceries indépendants, d’abord à Montréal.", tag: "hypothèse" },
        { text: "Note Google entre 4,0 et 4,8, plus de 80 avis : bonne cuisine, gestion encore artisanale.", tag: "hypothèse" },
        { text: "Dépend d’UberEats ou DoorDash et n’a aucun programme de fidélité numérique.", tag: "hypothèse" },
        { text: "Interlocuteur : le propriétaire-opérateur, qui décide seul et vite.", tag: "hypothèse" },
      ],
    },
    {
      id: "offre",
      title: "L’offre",
      intro: "Quatre leviers : le résultat promis, la preuve, le délai, l’effort. Aujourd’hui la preuve est le maillon faible.",
      items: [
        { text: "Résultat : faire revenir les clients et récolter plus d’avis, sans publicité.", tag: "hypothèse" },
        { text: "Preuve : aucun résultat mesuré chez un restaurant payant. Priorité n° 1 : trois pilotes suivis de bout en bout, Mains Magique en premier.", tag: "vérifié" },
        { text: "Délai : configuration guidée d’environ 15 minutes.", tag: "à confirmer" },
        { text: "Effort : un QR (puis un chevalet NFC) et la caisse connectée si elle est compatible.", tag: "vérifié" },
        { text: "Entrée : accès gratuit pendant le développement, sans carte de crédit.", tag: "vérifié" },
        { text: "Deux chevalets NFC offerts à l’activation : idée non produite, coût et logistique à chiffrer.", tag: "à confirmer" },
      ],
    },
    {
      id: "canaux",
      title: "Les canaux",
      items: [
        { text: "Terrain : visite en heures creuses (14 h 30 à 16 h 30) avec une démo personnalisée sur le téléphone du gérant.", tag: "hypothèse" },
        { text: "Ambassadeurs de la restauration (barmans, chefs, consultants, fournisseurs) : 10 % de la première facture.", tag: "vérifié" },
        { text: "Contenu : nos marques personnelles aujourd’hui, des vidéos produit à partir de 2027.", tag: "cible" },
        { text: "Incubateurs et financement gouvernemental pour accélérer.", tag: "cible" },
      ],
    },
    {
      id: "entonnoir",
      title: "L’entonnoir à suivre",
      intro: "Visiteurs → inscriptions → restaurants activés → abonnés payants → rétention. Chaque étape a un chiffre dans le tableau de bord équipe.",
      items: [
        { text: "Restaurant activé = au moins 1 article publié et 1 client inscrit : le premier moment où l’app livre de la valeur. Définition retenue et appliquée dans le tableau de bord.", tag: "vérifié" },
        { text: "Les visiteurs apparaissent dès que la clé PostHog est branchée.", tag: "vérifié" },
      ],
    },
    {
      id: "plan-90",
      title: "Plan des 90 premiers jours",
      teamOnly: true,
      items: [
        { text: "Mois 1, Montréal (Mile End, Plateau, Vieux-Montréal, Griffintown) : 20 restaurants actifs.", tag: "cible" },
        { text: "Mois 2, Québec, Laval et Brossard, avec 10 ambassadeurs : 55 restaurants actifs cumulés.", tag: "cible" },
        { text: "Mois 3, preuve par l’exemple et rapport de rentabilité : 120 restaurants actifs.", tag: "cible" },
      ],
      note: { tone: "info", text: "Ce sont les objectifs du document stratégique, pas des résultats." },
    },
    {
      id: "economie",
      title: "Économie unitaire",
      teamOnly: true,
      items: [
        { text: "Coût d’acquisition visé : moins de 120 $ CA.", tag: "cible" },
        { text: "Valeur sur 24 mois visée : plus de 2 400 $ CA.", tag: "cible" },
        { text: "Rapport valeur/coût visé : plus de 15 pour 1.", tag: "cible" },
      ],
      note: {
        tone: "warn",
        text: "Le document stratégique affiche des « constats terrain » (adoption de 89 %, conversion de 42 %, coût d’acquisition de 78 $, rétention de 98 %). Sans abonné payant, rien de cela n’est mesuré : ne les citez pas à un incubateur ou un investisseur comme des résultats.",
      },
    },
    {
      id: "priorites",
      title: "Priorités immédiates",
      teamOnly: true,
      items: [
        { text: "Signer et suivre trois restaurants pilotes, avec un avant/après mesuré.", tag: "cible" },
        { text: "Brancher PostHog pour mesurer l’entonnoir de la visite à l’inscription.", tag: "cible" },
        { text: "Faire passer Mains Magique d’« inscrit » à « activé » : le menu est en place, il manque le premier client inscrit.", tag: "cible" },
      ],
    },
  ],
};

export const ACADEMY_PAGES: AcademyPage[] = [PRODUCT_PAGE, GTM_PAGE];

/** Never serves teamOnly sections to non-employees (ambassadors). */
export function getAcademyPages(isTeamMember: boolean): AcademyPage[] {
  return ACADEMY_PAGES.map((page) => ({
    ...page,
    sections: page.sections.filter((section) => isTeamMember || !section.teamOnly),
  }));
}

export function getAcademyPage(slug: string, isTeamMember: boolean): AcademyPage | null {
  return getAcademyPages(isTeamMember).find((page) => page.slug === slug) ?? null;
}
