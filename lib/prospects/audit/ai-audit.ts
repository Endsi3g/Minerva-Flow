import "server-only";
import { runWebsiteAudit } from "./run-audit";
import type { WebsiteAuditReport, ProspectMenu } from "@/lib/prospects/types";
import { estimateMargin } from "@/lib/prospects/margin";
import { formatCurrency } from "@/lib/utils";

export type EnrichedAuditResult = {
  technicalAudit: WebsiteAuditReport;
  monthlyCommissionLoss: string;
  monthlyCommissionLossCents: number;
  averageOrderValue: string;
  assumedMonthlyOrders: number;
  /** "captured" when the estimate is derived from the prospect's own menu_json;
   * "estimated" when no menu was captured yet and a generic placeholder item
   * price was used instead — callers should soften any wording that implies
   * the figure came from this restaurant's actual menu. */
  menuSource: "captured" | "estimated";
  keyFindings: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
  };
  suggestedPitchAngle: string;
  customPitchEmailDraft: {
    subject: string;
    body: string;
  };
};

export async function generateEnrichedProspectAudit({
  restaurantName,
  websiteUrl,
  menu,
  commissionRatePct = 30,
  assumedMonthlyOrders = 450,
}: {
  restaurantName: string;
  websiteUrl: string;
  menu?: ProspectMenu;
  commissionRatePct?: number;
  assumedMonthlyOrders?: number;
}): Promise<EnrichedAuditResult> {
  const technicalAudit = await runWebsiteAudit(websiteUrl);

  const hasRealMenu = Boolean(menu?.categories?.some((c) => c.items.length > 0));
  const menuSource: "captured" | "estimated" = hasRealMenu ? "captured" : "estimated";

  // No menu captured yet for this prospect (the common case for a freshly-synced
  // Reach lead) — fall back to a generic casual-dining item price rather than
  // claiming a precise figure derived from a menu we don't actually have.
  const fallbackMenu: ProspectMenu = hasRealMenu
    ? menu!
    : {
        categories: [
          {
            id: "default",
            name: "Estimation générique",
            items: [
              {
                id: "default-1",
                name: "Prix moyen d'un plat (estimation générique)",
                priceCents: 1800,
                inStock: true,
                dietaryTags: [],
                modifierGroups: [],
              },
            ],
          },
        ],
      };

  const margin = estimateMargin(fallbackMenu, commissionRatePct, assumedMonthlyOrders);
  const monthlyLossFormatted = formatCurrency(margin.monthlyLossCents / 100);
  const avgBasketFormatted = formatCurrency(margin.averageOrderValueCents / 100);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];

  const passedChecks = technicalAudit.checks.filter((c) => c.passed).map((c) => c.id);
  const failedChecks = technicalAudit.checks.filter((c) => !c.passed).map((c) => c.id);

  if (passedChecks.includes("https")) {
    strengths.push("Connexion sécurisée SSL/HTTPS active.");
  }
  if (passedChecks.includes("speed")) {
    strengths.push("Temps de réponse du serveur rapide (< 1.5s).");
  }
  if (passedChecks.includes("mobileViewport")) {
    strengths.push("Affichage adapté aux écrans mobiles (viewport configuré).");
  }
  if (passedChecks.includes("clickablePhone")) {
    strengths.push("Numéro de téléphone cliquable pour appel direct.");
  }

  if (failedChecks.includes("onlineOrdering")) {
    weaknesses.push("Aucun système de commande directe détecté sur le site officiel.");
    opportunities.push("Capturer 100% des commandes à emporter et livraison sans intermédiaire.");
  } else {
    strengths.push("Présence d'un canal de commande en ligne.");
    opportunities.push("Migrer le flux de commande vers une solution sans commission de 30%.");
  }

  if (failedChecks.includes("onlineReservation")) {
    weaknesses.push("Pas de module de réservation de table en ligne direct.");
    opportunities.push("Permettre la réservation instantanée 24/7 directement sur votre page.");
  }

  if (failedChecks.includes("seoBasics")) {
    weaknesses.push("Optimisation SEO de base incomplète (titre ou meta description manquants).");
    opportunities.push("Améliorer le référencement local Google pour attirer plus de clients montréalais.");
  }

  if (margin.monthlyLossCents > 0) {
    const basis = menuSource === "captured" ? "" : " (estimation générique, menu non capturé)";
    weaknesses.push(`Pertes de marge estimées à ~${monthlyLossFormatted}/mois reversées aux plateformes tierces${basis}.`);
    opportunities.push(`Récupérer jusqu'à ${monthlyLossFormatted}/mois en marge brute avec Minerva Flow.`);
  }

  if (strengths.length === 0) {
    strengths.push("Établissement disposant d'un nom de domaine officiel.");
  }

  const suggestedPitchAngle =
    failedChecks.includes("onlineOrdering")
      ? "Opportunité Commande Directe & Récupération des 30% de commission"
      : "Optimisation de rentabilité et programme de fidélisation propriétaire";

  const subject = `Proposition d'optimisation pour ${restaurantName} (Économie estimée : ${monthlyLossFormatted}/mois)`;
  const lossClause =
    menuSource === "captured"
      ? `vous pourriez récupérer jusqu'à ${monthlyLossFormatted} par mois de commissions cédées aux agrégateurs`
      : `des restaurants comparables récupèrent souvent jusqu'à ${monthlyLossFormatted} par mois en évitant les commissions des agrégateurs`;
  const body = `Bonjour,\n\nEn analysant la présence numérique de ${restaurantName}, nous avons constaté une opportunité majeure : en conservant vos commandes à emporter et livraisons sur votre propre plateforme directe, ${lossClause}.\n\nNous avons préparé une démo clé en main avec votre propre menu pour tester l'expérience client.\n\nSeriez-vous ouvert à un rapide échange de 10 minutes cette semaine ?`;

  return {
    technicalAudit,
    monthlyCommissionLoss: monthlyLossFormatted,
    monthlyCommissionLossCents: margin.monthlyLossCents,
    averageOrderValue: avgBasketFormatted,
    assumedMonthlyOrders,
    menuSource,
    keyFindings: {
      strengths,
      weaknesses,
      opportunities,
    },
    suggestedPitchAngle,
    customPitchEmailDraft: {
      subject,
      body,
    },
  };
}
