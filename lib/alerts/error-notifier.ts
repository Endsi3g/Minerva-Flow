import { Resend } from "resend";
import { createHash } from "crypto";

// Fallback recipient if ALERT_NOTIFICATION_EMAIL is not set
const DEFAULT_ALERT_RECIPIENT = "kbelceus776@gmail.com";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";
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

  const subject = `🚨 [Minerva Flow] Alerte Critique : ${errName} (${source})`;

  const metadataRows = Object.entries(details.metadata ?? {})
    .map(
      ([key, val]) =>
        `<tr><td style="padding:4px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db;">${key}</td><td style="padding:4px 8px; color:#1a1e16; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${String(val)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin:0; padding:28px 16px; background-color:#f5f1e6; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1a1e16;">
  <div style="max-width:680px; margin:0 auto; background:#fffefa; border:1px solid #e6e0d0; border-radius:24px; box-shadow:0 12px 36px rgba(26, 30, 22, 0.08); overflow:hidden;">
    
    <!-- En-tête de marque avec accent émeraude -->
    <div style="background:#0e5a40; padding:28px 32px; border-bottom:3px solid #167f5b; color:#fffefa;">
      <div style="display:inline-block; padding:4px 12px; background:#dfff5f; color:#0a4531; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; border-radius:999px; margin-bottom:12px;">
        Alerte Système Critique
      </div>
      <h1 style="margin:0; font-family:'New York', -apple-system-serif, 'Playfair Display', Georgia, serif; font-size:24px; font-weight:700; line-height:1.25; color:#ffffff;">
        Incident détecté sur Minerva Flow
      </h1>
      <p style="margin:8px 0 0; font-size:13px; color:#dcece3; opacity:0.9;">
        Environnement : <strong>${env.toUpperCase()}</strong> · Source : <strong>${source}</strong>
      </p>
    </div>

    <!-- Corps de l'alerte -->
    <div style="padding:32px;">
      
      <!-- Erreur principale -->
      <div style="background:#fcfaf5; border:1px solid #e6e0d0; border-left:4px solid #ab7d1f; border-radius:12px; padding:18px 20px; margin-bottom:24px;">
        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:#8d9488; font-weight:700; margin-bottom:4px;">
          Type & Message de l'exception
        </div>
        <div style="font-size:16px; font-weight:700; color:#1a1e16; font-family:'JetBrains Mono', monospace; word-break:break-word;">
          ${errName}: ${errMessage}
        </div>
        ${details.context ? `<p style="margin:8px 0 0; font-size:13px; color:#565f52;"><strong>Contexte :</strong> ${details.context}</p>` : ""}
      </div>

      <!-- Métadonnées d'exécution -->
      <h3 style="font-family:'New York', serif; font-size:16px; margin:0 0 12px; color:#1a1e16;">
        Contexte d'exécution
      </h3>
      <table style="width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:24px;">
        <tbody>
          <tr>
            <td style="padding:6px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db; width:35%;">Date & Heure</td>
            <td style="padding:6px 8px; color:#1a1e16; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding:6px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db;">Empreinte (Fingerprint)</td>
            <td style="padding:6px 8px; color:#1a1e16; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${fingerprint} (Vu ${occurrences} fois)</td>
          </tr>
          ${details.url ? `<tr><td style="padding:6px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db;">URL Requêtée</td><td style="padding:6px 8px; color:#167f5b; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${details.url}</td></tr>` : ""}
          ${details.userId ? `<tr><td style="padding:6px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db;">ID Utilisateur</td><td style="padding:6px 8px; color:#1a1e16; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${details.userId}</td></tr>` : ""}
          ${details.userEmail ? `<tr><td style="padding:6px 8px; font-weight:600; color:#565f52; border-bottom:1px solid #eee9db;">Email Utilisateur</td><td style="padding:6px 8px; color:#1a1e16; font-family:'JetBrains Mono',monospace; border-bottom:1px solid #eee9db;">${details.userEmail}</td></tr>` : ""}
          ${metadataRows}
        </tbody>
      </table>

      <!-- Stack Trace -->
      <h3 style="font-family:'New York', serif; font-size:16px; margin:0 0 10px; color:#1a1e16;">
        Trace d'exécution (Stack Trace)
      </h3>
      <div style="background:#1a1e16; color:#dcece3; border-radius:12px; padding:16px; font-family:'JetBrains Mono', monospace; font-size:11.5px; line-height:1.55; overflow-x:auto; white-space:pre-wrap; max-height:320px; overflow-y:auto; border:1px solid #0e5a40;">${errStack}</div>

      <!-- Action rapide -->
      <div style="margin-top:28px; text-align:center;">
        <a href="https://minervaflow.app" style="display:inline-block; padding:12px 28px; background-color:#167f5b; color:#ffffff; font-size:13.5px; font-weight:700; text-decoration:none; border-radius:999px;">
          Ouvrir Minerva Flow →
        </a>
      </div>

    </div>

    <!-- Pied de page officiel -->
    <div style="padding:20px 32px; background:#fbf9f3; border-top:1px solid #eee9db; text-align:center; font-size:12px; color:#8d9488;">
      Ce message est une notification technique automatique générée par Minerva Flow.<br />
      © 2026 Minerva Flow · Minerva Technologies Inc. · Montréal (Québec), Canada
    </div>

  </div>
</body>
</html>`;

  return { subject, html };
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
    console.info(`[ErrorNotifier] 🚨 Alerte critique expédiée avec succès à ${recipient} (fingerprint: ${fingerprint})`);
    return { sent: true };
  } catch (notifierErr) {
    // Ultimate defensive catch: never crash the calling application
    console.error("[ErrorNotifier] Erreur interne dans le notifier d'erreur:", notifierErr);
    return { sent: false, reason: "internal_notifier_exception" };
  }
}
