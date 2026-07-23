/**
 * Cloudflare Workers AI integration for Flow par Minerva
 * Supports Cloudflare AI models (Meta Llama 3.1 8B, Mistral 7B, Gemma 7B)
 * when CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are configured.
 */

export const CLOUDFLARE_DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export function isCloudflareAiConfigured() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
}

export async function runCloudflareAiModel(prompt: string, systemPrompt?: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL || CLOUDFLARE_DEFAULT_MODEL;

  if (!accountId || !apiToken) return null;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt || "Tu es l'assistant de gestion Minerva." },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.result?.response || null;
  } catch (err) {
    console.error("[Cloudflare AI Run Error]", err);
    return null;
  }
}
