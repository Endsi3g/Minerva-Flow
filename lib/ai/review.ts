import { generateText, Output } from "ai";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { formatCurrency } from "@/lib/utils";
import type { ReportDef } from "@/lib/reports";

const aiReviewSchema = z.object({
  strengths: z
    .array(z.string())
    .describe("2 à 4 points forts concrets sur la période, chacun ancré dans un chiffre précis fourni."),
  weaknesses: z
    .array(z.string())
    .describe("2 à 4 points faibles ou signaux d'alerte concrets, basés sur les chiffres fournis."),
  recommendations: z
    .array(z.string())
    .describe("2 à 4 actions concrètes et réalisables à prendre pour la période suivante."),
});

export type AiReviewResult = {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

/**
 * Generates a short, French-language performance review from an
 * already-computed set of ReportDef metrics — reused by both the weekly
 * cron (automatic) and the on-demand "Générer une revue IA" action, so the
 * review always reflects the exact period the caller already fetched data
 * for, rather than recomputing anything itself.
 */
export async function generateAiReview(
  restaurantName: string,
  periodLabel: string,
  reports: ReportDef[]
): Promise<AiReviewResult | null> {
  if (!isAiConfigured()) return null;
  if (reports.length === 0) return null;

  const metricsSummary = reports
    .map((r) => {
      const value = r.unit === "currency" ? formatCurrency(r.value) : String(r.value);
      const delta = r.delta !== undefined ? ` (${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}% vs période précédente)` : "";
      return `- ${r.label} : ${value}${delta}`;
    })
    .join("\n");

  try {
    const { output } = await generateText({
      model: AI_MODEL,
      output: Output.object({ schema: aiReviewSchema }),
      system: `Tu es un consultant en gestion de restaurant. Voici les métriques de "${restaurantName}" pour la période "${periodLabel}" :\n\n${metricsSummary}`,
      prompt:
        "Rédige une revue de performance concise et actionnable en français, destinée au propriétaire du restaurant. Reste strictement ancré dans les chiffres fournis ci-dessus — n'invente aucune donnée, aucun chiffre qui n'y figure pas.",
    });
    return output;
  } catch (error) {
    console.error("AI review generation failed:", error);
    return null;
  }
}
