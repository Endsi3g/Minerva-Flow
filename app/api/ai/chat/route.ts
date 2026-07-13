import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/config";
import { buildDataSnapshot } from "@/lib/ai/context";

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

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: AI_MODEL,
    system: buildDataSnapshot(),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
