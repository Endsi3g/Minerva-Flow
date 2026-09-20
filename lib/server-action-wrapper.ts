import * as Sentry from "@sentry/nextjs";
import { notifyCriticalError, isIgnorableError } from "./alerts/error-notifier";

export type SafeResult<T> =
  | { ok: true; data: T; error?: never; code?: never }
  | { ok: false; error: string; code?: string; data?: never };

export interface SafeActionOptions {
  actionName?: string;
  isExpectedError?: (err: unknown) => boolean;
  suppressAlert?: boolean;
}

/**
 * High-reliability defensive wrapper for Server Actions.
 *
 * Guarantees that:
 * 1. An action NEVER throws unhandled exceptions into the client component (which causes white screens).
 * 2. Next.js internal control-flow errors (redirect, notFound) pass through untouched.
 * 3. Genuine unexpected server crashes / DB faults are captured by Sentry and trigger
 *    an immediate luxury critical alert email to the engineering team.
 * 4. A clean, typed, user-facing error response is returned to the UI.
 */
export function createSafeAction<TArgs extends unknown[], TReturn>(
  actionFn: (...args: TArgs) => Promise<TReturn>,
  options?: SafeActionOptions
) {
  return async (...args: TArgs): Promise<
    [TReturn] extends [{ ok: boolean }] ? TReturn : SafeResult<TReturn>
  > => {
    try {
      return (await actionFn(...args)) as any;
    } catch (err: unknown) {
      // 1. Rethrow Next.js internal control-flow exceptions (redirects, notFound)
      const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
      const digest = typeof (err as { digest?: unknown })?.digest === "string"
        ? ((err as { digest: string }).digest)
        : "";

      if (
        digest.startsWith("NEXT_REDIRECT") ||
        digest.startsWith("NEXT_NOT_FOUND") ||
        message.includes("next_redirect") ||
        message.includes("next_not_found")
      ) {
        throw err;
      }

      // 2. Classify if this is an expected validation / business error
      const isExpected = options?.isExpectedError ? options.isExpectedError(err) : isIgnorableError(err);

      if (!isExpected && !options?.suppressAlert) {
        // Critical / unexpected exception: send to Sentry and trigger instant critical alert email
        Sentry.captureException(err);
        void notifyCriticalError({
          error: err,
          source: "server_action",
          context: `Server Action: ${options?.actionName ?? actionFn.name ?? "anonymous"}`,
          metadata: {
            actionName: options?.actionName ?? actionFn.name ?? "anonymous",
            argsSummary: args.map((a) => (typeof a === "object" ? "[Object]" : String(a))).join(", "),
          },
        });
      }

      // 3. Graceful fallback message
      const userMessage = isExpected && err instanceof Error
        ? err.message
        : "Un incident technique temporaire est survenu. Nos équipes ont été alertées.";

      const errorCode = isExpected ? "VALIDATION_OR_USER_ERROR" : "INTERNAL_SERVER_ERROR";

      return {
        ok: false,
        error: userMessage,
        code: errorCode,
      } as any;
    }
  };
}
