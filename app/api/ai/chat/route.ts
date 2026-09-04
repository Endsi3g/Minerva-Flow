import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured, isFlowAiOnHold } from "@/lib/ai/config";
import { GEMINI_FALLBACK_MODEL, getGeminiApiKey } from "@/lib/ai/gemini";
import { buildRestaurantDataSnapshot } from "@/lib/ai/context";
import { getSpecialistById } from "@/lib/ai/specialists";
import { buildDossierContext } from "@/lib/ai/dossiers";
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
  if (isFlowAiOnHold()) {
    return NextResponse.json(
      { error: "Flow AI est temporairement en pause. Revenez bientôt !" },
      { status: 503 }
    );
  }

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
    agentId,
    activeDossiers,
  }: {
    messages: UIMessage[];
    restaurantId?: string;
    conversationId?: string;
    attachments?: PendingAttachment[];
    agentId?: string;
    activeDossiers?: string[];
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
      return NextResponse.json(
        {
          error:
            "Vous avez atteint le quota de tokens IA inclus dans votre plan actuel (" +
            usage.tokensUsed.toLocaleString("fr-FR") +
            " / " +
            usage.monthlyQuota.toLocaleString("fr-FR") +
            " tokens). Rendez-vous dans la section Facturation pour recharger votre quota.",
        },
        { status: 429 }
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

  const specialist = getSpecialistById(agentId ?? "general");
  let baseSystem = restaurantId
    ? await buildRestaurantDataSnapshot(restaurantId)
    : "Tu es Flow AI. Aucun établissement n'est encore associé à ce compte.";

  if (restaurantId && activeDossiers && activeDossiers.length > 0) {
    try {
      const dossierExtra = await buildDossierContext(restaurantId, activeDossiers);
      baseSystem += `\n\n=== CONTEXTE DOSSIERS RAG SÉLECTIONNÉS ===\n${dossierExtra}`;
    } catch (e) {
      console.error("Error attaching dossier context:", e);
    }
  }

  const system = `${baseSystem}

=== SPÉCIALISATION ACTIVE ===
${specialist.systemPromptAddendum}

=== RÈGLES DE FORMATAGE ET ACTIONS 1-CLIC ===
Tu as la capacité de proposer des actions directes 1-clic au gérant.
Quand une action opérationnelle est pertinente, génère-la dans ton texte sous la forme d'un bloc JSON avec le langage spécifique:

Pour un ajustement de prix ou statut plat:
\`\`\`minerva-action:menu
{
  "action": "update_menu_item",
  "title": "Mettre à jour le plat",
  "itemId": "<id-du-plat>",
  "name": "<nom-du-plat>",
  "price": 18.5,
  "active": true,
  "reason": "Réaligner le food cost sous 32%"
}
\`\`\`

Pour une campagne de fidélisation:
\`\`\`minerva-action:campaign
{
  "action": "create_campaign",
  "title": "Créer une campagne de fidélisation",
  "name": "Relance Habitués 14 jours",
  "description": "Offre un plat signature aux habitués n'étant pas revenus depuis 2 semaines",
  "channel": "email",
  "type": "relance",
  "estimatedRevenue": 750
}
\`\`\`

Pour une tâche de collaborateur:
\`\`\`minerva-action:task
{
  "action": "create_task",
  "title": "Assigner une tâche d'équipe",
  "employeeName": "Alexandre",
  "taskTitle": "Vérification des fiches techniques du soir",
  "description": "Contrôler le portionnement des sauces et le respect du grammage"
}
\`\`\`

Pour insérer un contenu directement dans le Canvas WYSIWYG latéral:
\`\`\`minerva-action:canvas
{
  "action": "insert_to_canvas",
  "title": "Fiche de rentabilité ou document",
  "content": "Contenu Markdown ou HTML complet à transférer dans l'éditeur Canvas"
}
\`\`\`
`;

  // Token-efficient sliding window : conserver uniquement les 6 derniers messages pour limiter la consommation de prompt tokens.
  const slidingWindowMessages = messages.slice(-6);

  // Modèle : priorité à Gemini en appel direct (clé GEMINI_API_KEY fournie par l'utilisateur — pas besoin
  // du Vercel AI Gateway, qui exige une carte de crédit sur le compte). Sinon, AI_MODEL via le Gateway.
  // Tout passe par streamText/toUIMessageStreamResponse — c'est le seul format que le client (AssistantChatTransport)
  // sait consommer ; un fetch direct qui renvoie du texte brut casse le rendu côté client.
  //
  // Modèle fixé à gemini-3.5-flash (pas GEMINI_AI_MODEL/gemini-3.7-flash) pour ce chat standard en
  // direct : mesuré en conditions réelles, 3.7-flash ignore silencieusement thinkingConfig.thinkingBudget=0
  // et brûle des tokens de pensée quand même (12s-2.9min, jusqu'à 173 tokens de pensée pour un "bonjour"),
  // alors que 3.5-flash respecte le budget et répond en <1s avec 0 token de pensée — un chat "en direct" ne
  // peut pas se permettre cette latence imprévisible.
  const geminiApiKey = getGeminiApiKey();
  const model = geminiApiKey
    ? createGoogleGenerativeAI({ apiKey: geminiApiKey })(GEMINI_FALLBACK_MODEL)
    : AI_MODEL;

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(slidingWindowMessages),
    // Chat standard en direct : thinkingBudget=0 pour une réponse instantanée, sans tokens de pensée gaspillés
    // (ignoré silencieusement par les modèles non-Google, donc sûr même quand AI_MODEL/gateway est utilisé).
    providerOptions: {
      google: {
        thinkingConfig: { thinkingBudget: 0 },
      },
    },
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
