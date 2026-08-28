import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { isGeminiAiConfigured, runGeminiWithUsage } from "@/lib/ai/gemini";
import { isCloudflareAiConfigured, runCloudflareAiModel } from "@/lib/ai/cloudflare";
import { isNvidiaAiConfigured, runNvidiaAiModel } from "@/lib/ai/nvidia";
import { buildRestaurantDataSnapshot } from "@/lib/ai/context";
import { saveArtifact, saveAttachment, saveMessage } from "@/lib/data/chat";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getWorkspaceAiUsage, trackAiTokenUsage } from "@/lib/data/ai-usage";

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
    .describe("Projection de tendance simple (régression linéaire)."),
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
          "L'assistant IA n'est pas configuré — ajoutez GEMINI_API_KEY ou AI_GATEWAY_API_KEY dans .env.local.",
      },
      { status: 503 }
    );
  }

  const {
    messages,
    restaurantId: bodyRestaurantId,
    conversationId,
    attachments,
  }: {
    messages: UIMessage[];
    restaurantId?: string;
    conversationId?: string;
    attachments?: PendingAttachment[];
  } = await req.json();

  const restaurantId = bodyRestaurantId ?? (await getCurrentRestaurantId()) ?? undefined;
  const canPersist = Boolean(restaurantId && conversationId);
  const lastMessage = messages[messages.length - 1];

  let workspaceId: string | null = null;
  if (restaurantId) {
    const restaurant = await getRestaurant(restaurantId);
    workspaceId = restaurant?.workspaceId ?? null;
  }

  // Vérification de quota IA par workspace
  if (workspaceId) {
    const usage = await getWorkspaceAiUsage(workspaceId);
    if (usage.isExceeded) {
      return new Response(
        "Vous avez atteint le quota de tokens IA inclus dans votre plan actuel (" +
          usage.tokensUsed.toLocaleString("fr-FR") +
          " / " +
          usage.monthlyQuota.toLocaleString("fr-FR") +
          " tokens). Rendez-vous dans la section Facturation pour recharger votre quota.",
        {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }
  }

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

  const system = restaurantId
    ? await buildRestaurantDataSnapshot(restaurantId)
    : "Tu es l'assistant de Flow par Minerva. Aucun établissement n'est encore associé à ce compte.";

  // Token-efficient sliding window: conserver uniquement les 6 derniers messages pour limiter la consommation de prompt tokens
  const slidingWindowMessages = messages.slice(-6);
  const recentHistoryFormatted = slidingWindowMessages
    .map((m) => {
      const txt = m.parts
        ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
        .map((p) => p.text)
        .join("\n");
      return `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${txt}`;
    })
    .join("\n");

  // 1. Priorité à Google Gemini 3.7 Flash avec optimisation maximale des tokens
  if (isGeminiAiConfigured()) {
    const userPrompt = recentHistoryFormatted || "Bonjour";

    // Thinking budget = 0 pour le chat standard en direct (réponse instantanée, 0 token de pensée gaspillé)
    const geminiResult = await runGeminiWithUsage(userPrompt, {
      systemPrompt: system,
      thinkingBudget: 0,
      maxOutputTokens: 2048,
    });

    const contentText =
      geminiResult?.text || "Désolé, impossible d'obtenir une réponse du modèle Google Gemini 3.7 Flash.";

    // Enregistrement des tokens consommés
    if (workspaceId && geminiResult?.usage?.totalTokens) {
      await trackAiTokenUsage(workspaceId, geminiResult.usage.totalTokens);
    }

    if (canPersist) {
      await saveMessage({
        conversationId: conversationId!,
        restaurantId: restaurantId!,
        role: "assistant",
        content: contentText,
      });
    }

    return new Response(contentText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 2. Si NVIDIA API est configurée
  if (isNvidiaAiConfigured() && !process.env.AI_GATEWAY_API_KEY) {
    const userPrompt = recentHistoryFormatted || "Bonjour";
    const responseText = await runNvidiaAiModel(userPrompt, system);
    const contentText = responseText || "Désolé, impossible d'obtenir une réponse du modèle NVIDIA GLM-5.2.";

    if (canPersist) {
      await saveMessage({
        conversationId: conversationId!,
        restaurantId: restaurantId!,
        role: "assistant",
        content: contentText,
      });
    }

    return new Response(contentText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 3. Si Cloudflare AI est configuré
  if (isCloudflareAiConfigured() && !process.env.AI_GATEWAY_API_KEY) {
    const userPrompt = recentHistoryFormatted || "Bonjour";
    const responseText = await runCloudflareAiModel(userPrompt, system);
    const contentText = responseText || "Désolé, impossible d'obtenir une réponse de Cloudflare AI.";

    if (canPersist) {
      await saveMessage({
        conversationId: conversationId!,
        restaurantId: restaurantId!,
        role: "assistant",
        content: contentText,
      });
    }

    return new Response(contentText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 4. StreamText / AI Gateway fallback
  const result = streamText({
    model: AI_MODEL,
    system,
    messages: await convertToModelMessages(messages),
    tools: {
      createArtifact: {
        description:
          "Génère un rapport visuel affiché dans le panneau Canvas, à partir des données du restaurant. " +
          "Types disponibles : 'table', 'chart', 'summary', 'comparison'.",
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
    onFinish: async ({ text, usage }) => {
      if (workspaceId && usage?.totalTokens) {
        await trackAiTokenUsage(workspaceId, usage.totalTokens);
      }
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
