import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  getGeminiApiKey,
  isGeminiAiConfigured,
} from "@/lib/ai/gemini";
import { formatCurrency } from "@/lib/utils";
import { createAiRuntimeContext, createAiTelemetry, flushAiObservability } from "@/lib/ai/observability";
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
  reports: ReportDef[],
  supplementaryContext?: string
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

  const fullContext = supplementaryContext ? `${metricsSummary}\n\n${supplementaryContext}` : metricsSummary;

  const geminiApiKey = getGeminiApiKey();
  if (isGeminiAiConfigured() && geminiApiKey && !process.env.AI_GATEWAY_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    const modelsToTry = [process.env.GEMINI_AI_MODEL || GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];
    const systemPrompt = `Tu es un consultant en gestion de restaurant. Voici les métriques de "${restaurantName}" pour la période "${periodLabel}" :\n\n${fullContext}`;
    const prompt = `Rédige une revue de performance concise et actionnable en français, destinée au propriétaire du restaurant. Reste strictement ancré dans les chiffres fournis ci-dessus.
Réponds STRICTEMENT au format JSON avec cette structure :
{
  "strengths": ["point fort 1 avec chiffre", "point fort 2 avec chiffre"],
  "weaknesses": ["point faible 1 avec chiffre", "point faible 2 avec chiffre"],
  "recommendations": ["action concrète 1", "action concrète 2"]
}`;

    for (const modelName of modelsToTry) {
      try {
        const { text } = await generateText({
          model: google(modelName),
          runtimeContext: createAiRuntimeContext("ai_review"),
          telemetry: createAiTelemetry("ai_review_gemini"),
          system: systemPrompt,
          prompt,
          temperature: 0.2,
          maxOutputTokens: 4096,
          providerOptions: {
            google: {
              thinkingConfig: { thinkingBudget: 1024 },
            },
          },
        });

        const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const validated = aiReviewSchema.safeParse(parsed);
        if (validated.success) return validated.data;
      } catch (err) {
        console.warn("[Gemini AI Review Parsing failed, fallback to AI_MODEL]", err);
      } finally {
        await flushAiObservability();
      }
    }
  }

  try {
    const { output } = await generateText({
      model: AI_MODEL,
      runtimeContext: createAiRuntimeContext("ai_review"),
      telemetry: createAiTelemetry("ai_review"),
      output: Output.object({ schema: aiReviewSchema }),
      system: `Tu es un consultant en gestion de restaurant. Voici les métriques de "${restaurantName}" pour la période "${periodLabel}" :\n\n${fullContext}`,
      prompt:
        "Rédige une revue de performance concise et actionnable en français, destinée au propriétaire du restaurant. Reste strictement ancré dans les chiffres fournis ci-dessus — n'invente aucune donnée, aucun chiffre qui n'y figure pas.",
    });
    return output;
  } catch (error) {
    console.error("AI review generation failed:", error);
    return null;
  } finally {
    await flushAiObservability();
  }
}
