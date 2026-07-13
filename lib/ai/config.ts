/**
 * Central place for the AI Gateway model choice + a readiness check so every
 * route/component can fail gracefully (fallback to rule-based output)
 * instead of crashing when AI_GATEWAY_API_KEY isn't set yet.
 */
export const AI_MODEL = "anthropic/claude-sonnet-5";

export function isAiConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}
