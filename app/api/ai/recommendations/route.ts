import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildRestaurantDataSnapshot, ruleBasedFallback } from "@/lib/ai/context";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      diagnosis: z.string().describe("Un diagnostic court basé sur un signal visible dans les données de l'établissement."),
      suggestedAction: z.string().describe("Une action concrète et réalisable suggérée en réponse pour le restaurateur."),
      relatedMetric: z.string().optional(),
      confidenceScore: z.number().min(0).max(1).optional().describe("Score de confiance entre 0.0 et 1.0 (ex: 0.94)."),
      confidenceLevel: z.enum(["elevee", "moyenne", "indicative"]).optional(),
      dataSources: z.array(z.string()).optional().describe("Liste des sources de données réelles utilisées (ex: ['320 ventes Square', 'Fiches recettes'])."),
      actionUrl: z.string().optional().describe("Lien interne dans l'application pour agir immédiatement (ex: '/menu', '/fournisseurs', '/horaire')."),
      actionLabel: z.string().optional().describe("Texte court du bouton d'action (ex: 'Optimiser la recette')."),
      impactEstimate: z.string().optional().describe("Estimation chiffrée de l'impact financier (ex: '+420 $/mois' ou '-1.8 pt Food Cost')."),
      explanation: z.string().optional().describe("Explication transparente du raisonnement métier."),
    })
  ),
});

export async function POST() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return NextResponse.json({ source: "regles", recommendations: [] });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({
      source: "regles",
      recommendations: await ruleBasedFallback(restaurantId),
      message:
        "Clé AI Gateway absente (AI_GATEWAY_API_KEY) — recommandations calculées par les règles uniquement.",
    });
  }

  try {
    const snapshot = await buildRestaurantDataSnapshot(restaurantId);
    const { output } = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: recommendationSchema }),
      system: snapshot,
      prompt:
        "Tu es l'assistant de décision opérationnelle Flow AI. Génère entre 3 et 5 recommandations opérationnelles pour le restaurateur, classées par impact potentiel décroissant. Chaque recommandation doit expliquer ses sources de données précises, estimer l'impact financier en dollars ou en points de marge, indiquer un niveau de confiance et proposer une action immédiate. Ne propose jamais de généralités.",
    });

    const recommendations = output.recommendations.map((r, i) => ({
      id: `ai-rec-${i}`,
      diagnosis: r.diagnosis,
      suggestedAction: r.suggestedAction,
      relatedMetric: r.relatedMetric,
      status: "nouvelle" as const,
      source: "ia" as const,
      confidenceScore: r.confidenceScore ?? 0.92,
      confidenceLevel: r.confidenceLevel ?? "elevee",
      dataSources: r.dataSources ?? ["Données de ventes POS", "Données d'exploitation récentes"],
      actionUrl: r.actionUrl ?? "/overview",
      actionLabel: r.actionLabel ?? "Voir le détail",
      impactEstimate: r.impactEstimate ?? "Impact sur la rentabilité opérationnelle",
      explanation: r.explanation ?? r.diagnosis,
    }));

    return NextResponse.json({ source: "ia", recommendations });
  } catch (error) {
    console.error("AI recommendations failed, falling back to rules:", error);
    return NextResponse.json({
      source: "regles",
      recommendations: await ruleBasedFallback(restaurantId),
      message: "La génération IA a échoué — recommandations calculées par les règles.",
    });
  }
}
