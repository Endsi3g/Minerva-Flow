import { isCloudflareAiConfigured } from "@/lib/ai/cloudflare";

/**
 * Central place for the AI Gateway / Cloudflare Workers AI model choice.
 * Returns true if ANY supported provider key is set (AI Gateway, OpenAI, Anthropic, or Cloudflare AI).
 */
export const AI_MODEL = process.env.CLOUDFLARE_AI_MODEL || "anthropic/claude-sonnet-5";

export function isAiConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      isCloudflareAiConfigured()
  );
}
