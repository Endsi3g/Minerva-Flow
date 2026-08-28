/**
 * Intégration optimisée pour Google Gemini API (Google AI Studio / Vertex)
 * Modèle par défaut : gemini-3.7-flash (avec fallback automatique si nécessaire)
 * Efficience maximale des tokens : support du thinkingBudget (0 = pas de tokens gaspillés, 1024 = analyse profonde)
 */

export const GEMINI_DEFAULT_MODEL = "gemini-3.7-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash";

export type GeminiUsage = {
  promptTokens: number;
  candidatesTokens: number;
  thoughtsTokens: number;
  totalTokens: number;
};

export type GeminiGenerateOptions = {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  thinkingBudget?: number; // 0 pour désactiver le thinking et économiser les tokens, 1024 pour analyse complexe
  model?: string;
};

export type GeminiResponse = {
  text: string;
  usage: GeminiUsage;
  model: string;
};

export function isGeminiAiConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
  );
}

export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    null
  );
}

/**
 * Exécute une requête Gemini avec optimisation maximale des tokens
 */
export async function runGeminiAiModel(
  prompt: string,
  systemPrompt?: string,
  options?: GeminiGenerateOptions
): Promise<string | null> {
  const result = await runGeminiWithUsage(prompt, {
    ...options,
    systemPrompt: systemPrompt ?? options?.systemPrompt,
  });
  return result?.text ?? null;
}

export async function runGeminiWithUsage(
  prompt: string,
  options?: GeminiGenerateOptions
): Promise<GeminiResponse | null> {
  const apiKey = getGeminiApiKey();
  const requestedModel = options?.model || process.env.GEMINI_AI_MODEL || GEMINI_DEFAULT_MODEL;

  if (!apiKey) {
    console.warn("[Gemini AI Warning] Clé GEMINI_API_KEY non configurée.");
    return null;
  }

  const thinkingBudget = options?.thinkingBudget !== undefined ? options.thinkingBudget : 0;
  const maxOutputTokens = options?.maxOutputTokens ?? 4096;
  const temperature = options?.temperature ?? 0.7;

  const payload = {
    ...(options?.systemPrompt && {
      system_instruction: {
        parts: [{ text: options.systemPrompt }],
      },
    }),
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(thinkingBudget >= 0 && {
        thinkingConfig: {
          thinkingBudget,
        },
      }),
    },
  };

  const modelsToTry = [requestedModel, GEMINI_FALLBACK_MODEL];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Gemini AI] Modèle ${model} a retourné ${res.status}: ${errText}`);
        continue; // Essayer le modèle de fallback
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      const meta = data.usageMetadata;
      const usage: GeminiUsage = {
        promptTokens: meta?.promptTokenCount ?? 0,
        candidatesTokens: meta?.candidatesTokenCount ?? 0,
        thoughtsTokens: meta?.thoughtsTokenCount ?? 0,
        totalTokens: meta?.totalTokenCount ?? (meta?.promptTokenCount ?? 0) + (meta?.candidatesTokenCount ?? 0),
      };

      return {
        text,
        usage,
        model,
      };
    } catch (err) {
      console.error(`[Gemini AI Error on ${model}]`, err);
    }
  }

  return null;
}
