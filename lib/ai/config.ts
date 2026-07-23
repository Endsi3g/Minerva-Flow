import { isCloudflareAiConfigured } from "@/lib/ai/cloudflare";
import { isNvidiaAiConfigured } from "@/lib/ai/nvidia";

/**
 * Central place for AI Gateway / Cloudflare / NVIDIA API Catalog model choice.
 * Returns true if ANY supported provider key is set.
 */
export const AI_MODEL = process.env.CLOUDFLARE_AI_MODEL || "anthropic/claude-sonnet-5";

export function isAiConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      isNvidiaAiConfigured() ||
      isCloudflareAiConfigured()
  );
}
