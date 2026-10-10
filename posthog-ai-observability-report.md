# PostHog AI Observability setup

> ⚠️ **Needs your attention**
> - Live ingestion is not yet confirmed: trigger an AI request and inspect the resulting trace in PostHog.
> - The full production build reaches successful TypeScript checking but cannot finish static-page generation because the environment has no free disk space (`ENOSPC`). Free disk space and rerun `npm run build` before release.

## Integration

This Node project uses the Vercel AI SDK (`ai` and `@ai-sdk/google`), so the **Vercel AI SDK/OpenTelemetry** observability path is configured.

- The Node-only bootstrap in `instrumentation.ts` starts the PostHog `PostHogSpanProcessor` through `lib/ai/observability.ts` before AI calls execute.
- The processor reads the existing environment-based `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST`; `.env.local` is configured with the supplied project values. No PostHog token or host is embedded in source.
- The existing observability dependencies (`@posthog/ai`, `@ai-sdk/otel`, `@opentelemetry/sdk-node`, and `@opentelemetry/resources`) were already declared, so no dependency changes were needed.
- `.posthog-wizard-cache/.posthog-ai.json` records this Vercel AI setup for subsequent wizard reporting.

## Instrumented call paths

| Path | Trace name | Attribution and grouping |
| --- | --- | --- |
| Flow AI chat | `flow_ai_chat` | Uses persisted `conversationId` as `$ai_session_id` and the authenticated stable user ID as `posthog.distinct_id`. Vercel AI records `createArtifact` executions as tool spans. |
| Menu insights | `menu_insights` | One-shot generation; no conversation or user identifier is available. |
| AI reviews | `ai_review` / `gemini_review` | The gateway path is instrumented directly; the direct-Gemini fallback now uses Vercel AI `generateText` with telemetry rather than a raw provider request. Scheduled runs remain anonymous because no user is in scope. |
| Menu extraction | `menu_extraction` | One-shot structured generation with telemetry and a request-end flush. The installed AI SDK version does not support runtime context for `generateObject`, so this path correctly remains without invented session or person attribution. |

For chat, multiple messages in one conversation share one AI session, while each streamed response is a separate trace. Tool executions are automatically nested in their invoking trace. One-shot operations do not fabricate a session or distinct ID.

## Verification

- `npm run lint` completed successfully.
- `npm run build` compiled successfully and completed TypeScript checking. Static-page generation subsequently failed because the environment reported `ENOSPC` while creating a `.next` output directory; this is an infrastructure disk-space blocker, not a TypeScript or telemetry failure.
- No model request was sent during setup, so ingestion is **wired, unverified**.

### How to verify ingestion

1. Deploy or restart the Node runtime with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` available.
2. Use the menu-scan flow to upload a small PDF or image. It exercises `menu_extraction` without requiring the currently paused chat flow.
3. In PostHog, open **AI Observability → Traces** and inspect the latest `menu_extraction` trace. Confirm that it has a generation with model, latency, token usage, and prompt/output content.
4. When Flow AI is enabled, send two messages in one conversation. Their traces should share `$ai_session_id`; a response that invokes `createArtifact` should include that tool span.

## Privacy mode

Prompt and completion recording is **enabled by default**. The telemetry configuration in `lib/ai/observability.ts` does not set `recordInputs: false` or `recordOutputs: false`, so SDK-recorded prompts and completions are sent to PostHog.

Before sending prompts or completions that must not be stored in PostHog, set `recordInputs: false` and/or `recordOutputs: false` in the `telemetry` configuration for the relevant Vercel AI call. These controls prevent the SDK from recording those fields; they do not remove custom attributes or already-ingested data.

See [AI Observability privacy mode](https://posthog.com/docs/ai-observability/privacy-mode) for details.
