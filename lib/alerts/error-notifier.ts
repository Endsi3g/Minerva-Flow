import { Resend } from "resend";
import { createHash } from "crypto";
import { isExpectedClientDisconnect } from "@/lib/alerts/request-errors";
import { renderMinervaEmail } from "@/lib/email/brand-shell";
import { MINERVA_EMAIL_FROM } from "@/lib/email/identity";

// Fallback recipient if ALERT_NOTIFICATION_EMAIL is not set
const DEFAULT_ALERT_RECIPIENT = "kbelceus776@gmail.com";
const FROM_EMAIL = MINERVA_EMAIL_FROM;
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export interface CriticalErrorDetails {
  error: unknown;
  context?: string;
  source?: "instrumentation" | "server_action" | "api_route" | "error_boundary" | "database" | "unknown";
  url?: string;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
}

// In-memory deduplication tracker
interface FingerprintRecord {
  firstSeenAt: number;
  lastSentAt: number;
  occurrences: number;
}

const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes silence per distinct fingerprint
const GLOBAL_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes sliding window
const MAX_GLOBAL_EMAILS_PER_WINDOW = 5; // Max 5 alert emails per 10 minutes

const fingerprintCache = new Map<string, FingerprintRecord>();
const recentDispatches: number[] = [];

/**
 * Filter out benign or expected non-critical errors (e.g. Next.js navigation,
 * standard 404, user typing wrong password).
 */
export function isIgnorableError(err: unknown): boolean {
  if (!err) return true;
  // Next.js can report a client-cancelled RSC stream as a render error. Keep
  // it visible in Sentry, but don't mislabel this transport close as critical.
  if (isExpectedClientDisconnect(err)) return true;

  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const name = err instanceof Error ? err.name : "";
  const digest = typeof (err as { digest?: unknown })?.digest === "string" 
    ? ((err as { digest: string }).digest)
    : "";

  // Next.js internal control flow errors
  if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")) {
    return true;
  }
  if (message.includes("next_redirect") || message.includes("next_not_found")) {
    return true;
  }

  // Client cancellation / abort blips
  if (name === "AbortError" || message.includes("aborted") || message.includes("econnreset")) {
    return true;
  }

  // Standard user authentication mistakes (not system crashes)
  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password") ||
    message.includes("user already registered") ||
    message.includes("email not confirmed")
  ) {
    return true;
  }

  return false;
}

/**
 * Generates a stable deterministic fingerprint for an error.
 */
function computeErrorFingerprint(details: CriticalErrorDetails): string {
  const err = details.error;
  const name = err instanceof Error ? err.name : "UnknownError";
  const message = err instanceof Error ? err.message : String(err);
  const topStack = err instanceof Error && err.stack 
    ? err.stack.split("\n").slice(0, 3).join("\n") 
    : "";

  const payload = `${details.source || "unknown"}:${name}:${message}:${topStack}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Formats a luxury editorial email conforming to Minerva Flow standards.
 */
function renderCriticalAlertEmail(
  details: CriticalErrorDetails,
  fingerprint: string,
  occurrences: number
): { subject: string; html: string } {
  const err = details.error;
  const errName = err instanceof Error ? err.name : "CriticalException";
  const errMessage = err instanceof Error ? err.message : String(err);
  const errStack = err instanceof Error ? err.stack ?? "Pas de trace disponible" : String(err);
  const timestamp = new Date().toISOString();
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const source = details.source ?? "serveur";
  const subject = `🚨 [Minerva Flow] Alerte critique : ${errName} (${source})`;
  const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const metadataRows = Object.entries(details.metadata ?? {})
    .map(([key, value]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-weight:600">${escapeHtml(key)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-family:'JetBrains Mono',monospace">${escapeHtml(String(value))}</td></tr>`)
    .join("");
  const optionalEntries: [string, string | undefined][] = [
    ["URL requêtée", details.url],
    ["ID utilisateur", details.userId],
    ["Courriel utilisateur", details.userEmail],
  ];
  const optionalRows = optionalEntries
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-weight:600">${label}</td><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-family:'JetBrains Mono',monospace">${escapeHtml(value)}</td></tr>`)
    .join("");
  const bodyHtml = `
    <p style="margin:0 0 14px"><strong>Environnement :</strong> ${escapeHtml(env.toUpperCase())} · <strong>Source :</strong> ${escapeHtml(source)}</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #e6e0d0;border-left:4px solid #ab7d1f;border-radius:12px;background:#fcfaf5">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#8d9488;font-weight:700">Type et message de l’exception</p>
      <p style="margin:0;font-family:'JetBrains Mono',monospace;overflow-wrap:anywhere"><strong>${escapeHtml(errName)}:</strong> ${escapeHtml(errMessage)}</p>
      ${details.context ? `<p style="margin:8px 0 0"><strong>Contexte :</strong> ${escapeHtml(details.context)}</p>` : ""}
    </div>
    <h2 style="margin:20px 0 10px;font-family:'New York','Playfair Display',Georgia,serif;color:#0e5a40;font-size:18px">Contexte d’exécution</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;margin-bottom:20px">
      <tbody><tr><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-weight:600">Date et heure</td><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-family:'JetBrains Mono',monospace">${timestamp}</td></tr>
      <tr><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-weight:600">Empreinte</td><td style="padding:6px 8px;border-bottom:1px solid #eee9db;font-family:'JetBrains Mono',monospace">${fingerprint} · ${occurrences} occurrence(s)</td></tr>${optionalRows}${metadataRows}</tbody>
    </table>
    <h2 style="margin:20px 0 10px;font-family:'New York','Playfair Display',Georgia,serif;color:#0e5a40;font-size:18px">Trace d’exécution</h2>
    <pre style="margin:0;padding:16px;border:1px solid #0e5a40;border-radius:12px;background:#1a1e16;color:#dcece3;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(errStack)}</pre>`;

  return {
    subject,
    html: renderMinervaEmail({
      eyebrow: "Alerte système critique",
      title: "Incident détecté sur Minerva Flow",
      preheader: `${errName} · ${source} · ${env}`,
      bodyHtml,
      ctaLabel: "Ouvrir Minerva Flow",
      ctaUrl: "https://minervaflow.app",
      footer: "Notification technique automatique.",
    }),
  };
}

/**
 * Dispatches a critical error alert email via Resend with deduplication and rate-limiting.
 * Fire-and-forget: NEVER throws to avoid compounding an existing failure.
 */
export async function notifyCriticalError(details: CriticalErrorDetails): Promise<{ sent: boolean; reason?: string }> {
  try {
    if (isIgnorableError(details.error)) {
      return { sent: false, reason: "ignorable_error" };
    }

    const now = Date.now();
    const fingerprint = computeErrorFingerprint(details);

    // 1. Deduplication check
    const existing = fingerprintCache.get(fingerprint);
    if (existing) {
      existing.occurrences += 1;
      if (now - existing.lastSentAt < DEDUPLICATION_WINDOW_MS) {
        // Still within silence window
        return { sent: false, reason: "deduplicated_suppression_active" };
      }
      existing.lastSentAt = now;
    } else {
      fingerprintCache.set(fingerprint, {
        firstSeenAt: now,
        lastSentAt: now,
        occurrences: 1,
      });
    }

    const resend = getResendClient();
    if (!resend) {
      console.warn("[ErrorNotifier] RESEND_API_KEY absente — alerte courriel non expédiée.");
      return { sent: false, reason: "missing_resend_key" };
    }

    // 2. Global rate limit check (sliding window)
    const tenMinutesAgo = now - GLOBAL_RATE_LIMIT_WINDOW_MS;
    while (recentDispatches.length > 0 && recentDispatches[0] < tenMinutesAgo) {
      recentDispatches.shift();
    }

    if (recentDispatches.length >= MAX_GLOBAL_EMAILS_PER_WINDOW) {
      console.warn("[ErrorNotifier] Plafond global d'alertes atteint (5 alertes / 10 min). Email supprimé pour éviter le spam.");
      return { sent: false, reason: "global_rate_limit_exceeded" };
    }

    const occurrences = fingerprintCache.get(fingerprint)?.occurrences ?? 1;
    const recipient = process.env.ALERT_NOTIFICATION_EMAIL ?? DEFAULT_ALERT_RECIPIENT;
    const { subject, html } = renderCriticalAlertEmail(details, fingerprint, occurrences);

    const { error: resendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      html,
    });

    if (resendError) {
      console.error("[ErrorNotifier] Échec d'envoi via Resend:", resendError);
      return { sent: false, reason: resendError.message };
    }

    recentDispatches.push(now);
    console.info(`[ErrorNotifier] Alerte critique expédiée (fingerprint: ${fingerprint})`);
    return { sent: true };
  } catch (notifierErr) {
    // Ultimate defensive catch: never crash the calling application
    console.error("[ErrorNotifier] Erreur interne dans le notifier d'erreur:", notifierErr);
    return { sent: false, reason: "internal_notifier_exception" };
  }
}
