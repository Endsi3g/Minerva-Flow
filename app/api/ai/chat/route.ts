import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildDataSnapshot, buildRestaurantDataSnapshot } from "@/lib/ai/context";
import { saveArtifact, saveAttachment, saveMessage } from "@/lib/data/chat";

const trendPointSchema = z.object({ date: z.string(), value: z.number() });

const comparisonDataSchema = z.object({
  charts: z
    .array(
      z.object({
        title: z.string(),
        seriesA: z.object({ label: z.string(), points: z.array(trendPointSchema) }),
        seriesB: z.object({ label: z.string(), points: z.array(trendPointSchema) }),
      })
    )
    .describe("Un ou plusieurs graphiques à deux courbes comparant deux séries dans le temps."),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        unit: z.enum(["currency", "percent", "count"]),
        momDelta: z.number().describe("Variation en % par rapport à la période précédente."),
        reportSlug: z
          .string()
          .optional()
          .describe("Slug de /reports/[slug] correspondant, si pertinent, pour rendre la ligne cliquable."),
      })
    )
    .describe("Table de métriques clés avec valeur et delta, façon 'Key metrics'."),
  summary: z.array(z.string()).describe("Points clés narratifs, 2-4 puces courtes."),
  prediction: z
    .object({
      label: z.string(),
      points: z.array(trendPointSchema),
      method: z.literal("trend"),
    })
    .optional()
    .describe(
      "Projection de tendance simple (régression linéaire, pas un vrai modèle ML) — utilise les valeurs de prévision déjà fournies dans le contexte quand disponibles, ne jamais inventer de chiffres."
    ),
});

const artifactSchema = z.object({
  title: z.string().describe("Titre court du rapport, ex: « Marge par programme »."),
  type: z.enum(["table", "chart", "summary", "comparison"]),
  data: z.union([
    z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.union([z.string(), z.number()]))) }),
    z.object({ points: z.array(z.object({ label: z.string(), value: z.number() })) }),
    z.object({ text: z.string() }),
    comparisonDataSchema,
  ]),
});

type PendingAttachment = {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "L'assistant IA n'est pas encore configuré — ajoutez AI_GATEWAY_API_KEY dans .env.local pour l'activer.",
      },
      { status: 503 }
    );
  }

  const {
    messages,
    restaurantId,
    conversationId,
    attachments,
  }: {
    messages: UIMessage[];
    restaurantId?: string;
    conversationId?: string;
    attachments?: PendingAttachment[];
  } = await req.json();

  const canPersist = Boolean(restaurantId && conversationId);
  const lastMessage = messages[messages.length - 1];

  if (canPersist && lastMessage?.role === "user") {
    const text = lastMessage.parts
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    const saved = await saveMessage({
      conversationId: conversationId!,
      restaurantId: restaurantId!,
      role: "user",
      content: text,
    });

    if (saved && attachments?.length) {
      await Promise.all(
        attachments.map((a) =>
          saveAttachment({
            messageId: saved.id,
            restaurantId: restaurantId!,
            storagePath: a.path,
            fileName: a.fileName,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          })
        )
      );
    }
  }

  const system = canPersist
    ? await buildRestaurantDataSnapshot(restaurantId!)
    : buildDataSnapshot();

  const result = streamText({
    model: AI_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: {
      createArtifact: {
        description:
          "Génère un rapport visuel affiché dans le panneau Canvas, à partir des données du restaurant déjà fournies dans le contexte. " +
          "Utilise ce tool proactivement dès que tu annonces un rapport à l'utilisateur (ex: « Voici le rapport... », « Je vais analyser... », « Regardons l'évolution de... ») — ne réponds pas seulement en texte quand un visuel serait plus clair. " +
          "Types disponibles : 'table' (données tabulaires simples), 'chart' (une seule série), 'summary' (texte formaté), et 'comparison' (le type le plus riche : graphiques à deux courbes + table de métriques clés avec delta + résumé en puces + prévision de tendance optionnelle) — préfère 'comparison' pour toute demande d'analyse ou de comparaison de métriques.",
        inputSchema: artifactSchema,
        execute: async (artifact) => {
          if (canPersist) {
            await saveArtifact({
              conversationId: conversationId!,
              restaurantId: restaurantId!,
              type: artifact.type,
              title: artifact.title,
              data: artifact.data,
            });
          }
          return `Rapport « ${artifact.title} » généré dans le panneau Canvas.`;
        },
      },
    },
    onFinish: async ({ text }) => {
      if (!canPersist || !text) return;
      await saveMessage({
        conversationId: conversationId!,
        restaurantId: restaurantId!,
        role: "assistant",
        content: text,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
