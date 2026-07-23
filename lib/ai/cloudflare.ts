/**
 * Cloudflare Workers AI & AI Gateway integration for Minerva Flow
 * Configured with Cloudflare Account ID: e4826a36912d92d343151792bb44fd46
 * Gateway ID: default
 * Models: workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast, @cf/moonshotai/kimi-k2.6
 */

export const CLOUDFLARE_ACCOUNT_ID_DEFAULT = "e4826a36912d92d343151792bb44fd46";
export const CLOUDFLARE_DEFAULT_MODEL = "workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function isCloudflareAiConfigured() {
  return Boolean(
    process.env.CF_AIG_TOKEN ||
      process.env.CLOUDFLARE_API_TOKEN ||
      process.env.CLOUDFLARE_ACCOUNT_ID
  );
}

export async function runCloudflareAiModel(prompt: string, systemPrompt?: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || CLOUDFLARE_ACCOUNT_ID_DEFAULT;
  const apiKey = process.env.CF_AIG_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  const model = process.env.CLOUDFLARE_AI_MODEL || CLOUDFLARE_DEFAULT_MODEL;

  if (!apiKey) {
    console.warn("[Cloudflare AI Warning] Clé API non configurée.");
    return null;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      console.error("[Cloudflare AI Gateway Error]", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.result?.response || data.result?.description || data.result || null;
  } catch (err) {
    console.error("[Cloudflare AI Gateway Error]", err);
    return null;
  }
}
