/**
 * Fire-and-forget reporting from client-side Error Boundaries.
 * Sends error details to /api/alerts/report-error so engineering receives an instant
 * critical alert email and Sentry telemetry without disrupting the client DOM.
 */
export function reportClientError(error: unknown, source: string = "error_boundary"): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const digest =
      typeof (error as { digest?: unknown })?.digest === "string"
        ? (error as { digest: string }).digest
        : "";

    void fetch("/api/alerts/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorName: err.name || "ClientError",
        errorMessage: err.message || "Unknown error",
        errorStack: err.stack || "",
        digest,
        url: typeof window !== "undefined" ? window.location.href : "",
        source,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ultimate defensive catch
  }
}
