import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildRestaurantDataSnapshot, ruleBasedFallback } from "@/lib/ai/context";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      diagnosis: z.string().describe("Un diagnostic court basé sur un signal visible dans les données."),
      suggestedAction: z.string().describe("Une action concrète et réalisable suggérée en réponse."),
      relatedMetric: z.string().optional(),
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
        "Génère entre 3 et 5 recommandations opérationnelles pour le propriétaire du restaurant, classées par impact potentiel décroissant. Chaque recommandation doit être ancrée dans un signal précis des données fournies (un chiffre, une alerte, une tendance) — ne propose rien de générique.",
    });

    const recommendations = output.recommendations.map((r, i) => ({
      id: `ai-rec-${i}`,
      diagnosis: r.diagnosis,
      suggestedAction: r.suggestedAction,
      relatedMetric: r.relatedMetric,
      status: "nouvelle" as const,
      source: "ia" as const,
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
