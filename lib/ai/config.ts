import { isCloudflareAiConfigured } from "@/lib/ai/cloudflare";
import { isNvidiaAiConfigured } from "@/lib/ai/nvidia";
import { isGeminiAiConfigured } from "@/lib/ai/gemini";

/**
 * Central place for AI Gateway / Cloudflare / NVIDIA / Gemini model choice.
 * Returns true if ANY supported provider key is set.
 */
export const AI_MODEL = process.env.CLOUDFLARE_AI_MODEL || "anthropic/claude-sonnet-5";

export function isAiConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      isGeminiAiConfigured() ||
      isNvidiaAiConfigured() ||
      isCloudflareAiConfigured()
  );
}

/**
 * Kill switch for Flow AI (the assistant/chat feature) — flip to false to
 * bring it back. While true, every Flow AI route stays navigable (sidebar
 * link, conversation history, page shell all still render — "reachable"),
 * but sending a message is blocked with a clear message, both server-side
 * (app/api/ai/chat) and client-side (AssistantChatView's composer overlay)
 * — "not usable". A plain code constant rather than an env var: flipping
 * it only needs a merged commit, not Vercel dashboard access.
 */
export const FLOW_AI_ON_HOLD = true;

export function isFlowAiOnHold(): boolean {
  return FLOW_AI_ON_HOLD;
}
