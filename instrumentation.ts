import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: "react-server-components" | "server-rendering";
    revalidateReason?: "on-demand" | "stale" | "prerender";
  }
) {
  // 1. Déléguer la capture télémétrique à Sentry
  await Sentry.captureRequestError(err, request, context);

  // 2. Déclencher l'alerte email critique (dédupliquée) via Resend
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { notifyCriticalError } = await import("@/lib/alerts/error-notifier");
      await notifyCriticalError({
        error: err,
        source: "instrumentation",
        context: `Next.js onRequestError [${context.routeType ?? "request"} : ${context.routePath ?? request.path}]`,
        url: request.path,
        metadata: {
          method: request.method,
          routePath: context.routePath,
          routeType: context.routeType,
          routerKind: context.routerKind,
        },
      });
    } catch (notifierErr) {
      console.error("[Instrumentation] Échec dispatch alerte critique:", notifierErr);
    }
  }
}
