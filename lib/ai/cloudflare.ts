import { createAiGateway } from "ai-gateway-provider";
import { createUnified } from "ai-gateway-provider/providers/unified";
import { generateText } from "ai";

export const CLOUDFLARE_ACCOUNT_ID_DEFAULT = "e4826a36912d92d343151792bb44fd46";
export const CLOUDFLARE_DEFAULT_MODEL = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function isCloudflareAiConfigured() {
  return Boolean(
    process.env.CF_AIG_TOKEN ||
      process.env.CLOUDFLARE_API_TOKEN ||
      process.env.CLOUDFLARE_ACCOUNT_ID
  );
}

export function getCloudflareAiGatewayModel(modelName?: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE_ACCOUNT_ID_DEFAULT;
  const apiKey = process.env.CF_AIG_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

  const aigateway = createAiGateway({
    accountId,
    gateway: "default",
    apiKey,
  });

  const unified = createUnified();
  const targetModel = modelName || process.env.CLOUDFLARE_AI_MODEL || CLOUDFLARE_DEFAULT_MODEL;

  return aigateway(unified(targetModel as any));
}

export async function runCloudflareAiModel(prompt: string, systemPrompt?: string) {
  try {
    const model = getCloudflareAiGatewayModel();
    const { text } = await generateText({
      model,
      system: systemPrompt || "Tu es l'assistant de gestion Minerva Flow.",
      prompt,
    });
    return text;
  } catch (err) {
    console.error("[Cloudflare AI Gateway Error]", err);
    return null;
  }
}
