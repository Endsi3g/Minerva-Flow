import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getGeminiApiKey, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL } from "@/lib/ai/gemini";
import { createAiTelemetry, flushAiObservability } from "@/lib/ai/observability";

const ExtractedItemSchema = z.object({
  name: z.string().describe("Nom du plat ou de la boisson, tel qu'écrit sur le menu"),
  category: z
    .string()
    .nullable()
    .describe("Section du menu où figure l'item (ex: Entrées, Plats principaux, Desserts, Boissons), ou null si le menu n'a pas de sections"),
  price: z.number().describe("Prix en dollars, nombre seul sans symbole monétaire — le prix de base, pas celui d'une option"),
  description: z.string().nullable().describe("Description telle qu'écrite sur le menu, ou null si absente"),
});

const ExtractedMenuSchema = z.object({
  items: z.array(ExtractedItemSchema),
});

export type ExtractedMenuItem = z.infer<typeof ExtractedItemSchema>;

const EXTRACTION_PROMPT =
  "Analyse ce menu de restaurant (PDF ou image) et extrais CHAQUE plat et boisson distinct qui y figure, avec son nom exact, sa section/catégorie telle qu'imprimée, son prix de base en dollars (nombre seul; utilise 0 uniquement si aucun prix n'est affiché), et sa description si le menu en fournit une. N'invente aucun item, aucun prix, aucune description qui ne figure pas explicitement dans le document. Ignore les logos, coordonnées, mentions légales et allergènes génériques.";

/**
 * One-shot structured extraction — no persistence, no review-state here.
 * The caller (the menu-scan API route) owns turning this into a review
 * screen; this function only ever returns what the PDF actually says.
 */
export async function extractMenuFromPdf(
  pdfBytes: Uint8Array
): Promise<{ items: ExtractedMenuItem[] } | { error: string }> {
  return extractMenuFromFile(pdfBytes, "application/pdf");
}

export async function extractMenuFromFile(
  fileBytes: Uint8Array,
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"
): Promise<{ items: ExtractedMenuItem[] } | { error: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { error: "L'extraction par IA n'est pas configurée pour ce compte." };

  const google = createGoogleGenerativeAI({ apiKey });
  const modelsToTry = [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];

  for (const modelName of modelsToTry) {
    try {
      const { object } = await generateObject({
        model: google(modelName),
        telemetry: createAiTelemetry("menu_extraction"),
        schema: ExtractedMenuSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: fileBytes, mediaType },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      });
      if (object.items.length === 0) continue;
      return { items: object.items };
    } catch (err) {
      console.error(`[menu-extraction] ${modelName} failed:`, err instanceof Error ? err.message : err);
    } finally {
      await flushAiObservability();
    }
  }

  return { error: "Impossible d'extraire des plats de ce PDF. Vérifiez que le fichier contient bien un menu lisible." };
}
