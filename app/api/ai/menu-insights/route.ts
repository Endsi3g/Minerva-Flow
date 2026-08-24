import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildRestaurantDataSnapshot } from "@/lib/ai/context";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";

const menuInsightsSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe("Titre court de l'idée de campagne, ex: « Relance des habitués du weekend »."),
      action: z
        .string()
        .describe("Action concrète à lancer (canal, cible, message), ancrée dans un signal précis des données."),
    })
  ),
});

export async function POST() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return NextResponse.json({ ideas: [] });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({
      ideas: [],
      message: "Clé AI Gateway absente (AI_GATEWAY_API_KEY) — analyse IA indisponible.",
    });
  }

  try {
    const snapshot = await buildRestaurantDataSnapshot(restaurantId);
    const { output } = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: menuInsightsSchema }),
      system: snapshot,
      prompt:
        "À partir des sections « Rentabilité du menu » et « Clients & fidélité » ci-dessus, génère entre 2 et 4 idées de campagnes marketing pour faire revenir les clients réguliers inactifs et mettre en valeur les plats rentables. Ne propose jamais d'ajuster un prix — uniquement des campagnes (offre ciblée, message de relance, mise en avant d'un plat).",
    });

    return NextResponse.json({ ideas: output.ideas });
  } catch (error) {
    console.error("AI menu insights failed:", error);
    return NextResponse.json({ ideas: [], message: "La génération IA a échoué — réessayez plus tard." });
  }
}
