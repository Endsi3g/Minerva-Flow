/**
 * Cloudflare Workers AI & AI Gateway integration for Minerva Flow
 * Configured with Cloudflare Account ID: e4826a36912d92d343151792bb44fd46
 * Gateway ID: default
 * Models: @cf/moonshotai/kimi-k2.6, @cf/meta/llama-3.1-8b-instruct
 */

export const CLOUDFLARE_ACCOUNT_ID_DEFAULT = "e4826a36912d92d343151792bb44fd46";
export const CLOUDFLARE_DEFAULT_MODEL = "@cf/moonshotai/kimi-k2.6";

export function isCloudflareAiConfigured() {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_ACCOUNT_ID);
}

export async function runCloudflareAiModel(prompt: string, systemPrompt?: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE_ACCOUNT_ID_DEFAULT;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL || CLOUDFLARE_DEFAULT_MODEL;

  if (!apiToken) {
    console.warn("[Cloudflare AI Warning] CLOUDFLARE_API_TOKEN non configuré.");
    return null;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "cf-aig-gateway-id": "default",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: {
            messages: [
              { role: "system", content: systemPrompt || "Tu es l'assistant de gestion Minerva Flow." },
              { role: "user", content: prompt },
            ],
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Cloudflare AI Error]", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.result?.response || data.result?.description || data.result || null;
  } catch (err) {
    console.error("[Cloudflare AI Run Error]", err);
    return null;
  }
}
