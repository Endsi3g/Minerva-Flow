import { OpenTelemetry } from "@ai-sdk/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";

let posthogSpanProcessor: PostHogSpanProcessor | undefined;
let initialized = false;

/**
 * Opt-in (POSTHOG_AI_OBSERVABILITY=1). It starts an OpenTelemetry NodeSDK, and
 * @sentry/nextjs also owns the global OpenTelemetry tracer provider: enabling
 * both without a check on a real deployment could drop one of the two trace
 * streams. Verify ingestion in PostHog and Sentry on a preview before turning
 * it on in production. Never throws: telemetry must not stop the server.
 */
export function initializeAiObservability() {
  if (initialized) return;
  initialized = true;
  if (process.env.POSTHOG_AI_OBSERVABILITY !== "1") return;

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST;
  if (!projectToken || !host) {
    console.warn("[AI observability] PostHog token or host missing: AI traces are not sent.");
    return;
  }

  try {
    posthogSpanProcessor = new PostHogSpanProcessor({ projectToken, host });

    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        "service.name": "minerva-flow",
      }),
      spanProcessors: [posthogSpanProcessor],
    });

    sdk.start();

    registerTelemetry(
      new OpenTelemetry({
        enrichSpan: ({ runtimeContext }) => ({
          "posthog.distinct_id":
            typeof runtimeContext?.distinctId === "string" ? runtimeContext.distinctId : undefined,
          "$ai_session_id": typeof runtimeContext?.sessionId === "string" ? runtimeContext.sessionId : undefined,
          "$ai_trace_name": typeof runtimeContext?.traceName === "string" ? runtimeContext.traceName : undefined,
        }),
      }) as never
    );
  } catch (error) {
    console.warn("[AI observability] Initialization failed, continuing without it:", error);
    posthogSpanProcessor = undefined;
  }
}

export function createAiRuntimeContext(
  traceName: string,
  context: { distinctId?: string; sessionId?: string } = {}
) {
  return {
    distinctId: context.distinctId,
    sessionId: context.sessionId,
    traceName,
  };
}

export function createAiTelemetry(functionId: string) {
  return {
    functionId,
    includeRuntimeContext: {
      distinctId: true,
      sessionId: true,
      traceName: true,
    },
  } as const;
}

export async function flushAiObservability() {
  try {
    await posthogSpanProcessor?.forceFlush();
  } catch (error) {
    console.error("[AI observability] Unable to flush PostHog spans:", error);
  }
}
