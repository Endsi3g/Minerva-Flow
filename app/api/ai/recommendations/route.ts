import { NextResponse } from "next/server";
import { ruleBasedFallback } from "@/lib/ai/context";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";

/**
 * Return only evidence-backed recommendations. The previous model-generated
 * scores, sources, and impact figures were not independently verifiable; AI
 * enrichment will be reintroduced after it can be constrained to these rules.
 */
export async function POST() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return NextResponse.json({ source: "regles", recommendations: [] });
  }

  return NextResponse.json({
    source: "regles",
    recommendations: await ruleBasedFallback(restaurantId),
    message: "Conseils recalculés à partir des signaux disponibles dans cet espace.",
  });
}
