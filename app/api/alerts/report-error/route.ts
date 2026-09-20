import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { notifyCriticalError } from "@/lib/alerts/error-notifier";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      errorName = "ClientError",
      errorMessage = "Unknown client error",
      errorStack = "",
      digest = "",
      url = "",
      source = "error_boundary",
    } = body;

    const syntheticError = new Error(String(errorMessage));
    syntheticError.name = String(errorName);
    if (errorStack) {
      syntheticError.stack = String(errorStack);
    }

    // Capture in Sentry
    Sentry.captureException(syntheticError, {
      extra: { digest, clientUrl: url, source },
    });

    // Notify engineering team via email
    await notifyCriticalError({
      error: syntheticError,
      source: "error_boundary",
      context: `Client Error Boundary [${source}] sur ${url || "page inconnue"}`,
      url: url || req.nextUrl.pathname,
      metadata: { digest, source },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ReportErrorAPI] Échec du traitement du rapport d'erreur:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
