import { OpenTelemetry } from "@ai-sdk/otel";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { registerTelemetry } from "ai";

let posthogSpanProcessor: PostHogSpanProcessor | undefined;
let initialized = false;

export function initializeAiObservability() {
  if (initialized) return;
  initialized = true;

  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_HOST;

  if (!projectToken || !host) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
      );
    }
    return;
  }

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
