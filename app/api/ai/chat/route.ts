import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildDataSnapshot } from "@/lib/ai/context";
import { saveArtifact, saveAttachment, saveMessage } from "@/lib/data/chat";

const artifactSchema = z.object({
  title: z.string().describe("Titre court du rapport, ex: « Marge par programme »."),
  type: z.enum(["table", "chart", "summary"]),
  data: z.union([
    z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.union([z.string(), z.number()]))) }),
    z.object({ points: z.array(z.object({ label: z.string(), value: z.number() })) }),
    z.object({ text: z.string() }),
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

  const result = streamText({
    model: AI_MODEL,
    system: buildDataSnapshot(),
    messages: await convertToModelMessages(messages),
    tools: {
      createArtifact: {
        description:
          "Génère un rapport visuel (tableau, graphique ou résumé) affiché dans le panneau Canvas, à partir des données du restaurant déjà fournies dans le contexte.",
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
