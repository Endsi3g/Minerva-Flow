/**
 * Integration pour NVIDIA API Catalog (z-ai/glm-5.2)
 * Base URL: https://integrate.api.nvidia.com/v1
 * Modèle: z-ai/glm-5.2
 */

export const NVIDIA_DEFAULT_MODEL = "z-ai/glm-5.2";

export function isNvidiaAiConfigured() {
  return Boolean(process.env.NVIDIA_API_KEY);
}

export async function runNvidiaAiModel(prompt: string, systemPrompt?: string) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_AI_MODEL || NVIDIA_DEFAULT_MODEL;

  if (!apiKey) {
    console.warn("[NVIDIA AI Warning] Clé NVIDIA_API_KEY non configurée.");
    return null;
  }

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt || "Tu es l'assistant de gestion Minerva Flow." },
          { role: "user", content: prompt },
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 16384,
        seed: 42,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[NVIDIA AI Error]", res.status, errText);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[NVIDIA AI Exception]", err);
    return null;
  }
}
