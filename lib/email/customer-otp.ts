import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Minerva Flow <flow@minervaflow.app>";

/**
 * The native iOS/Android apps ask for a typed 6-digit code rather than a
 * tapped magic link (deep-linking a link back into a native app is more
 * friction-prone than just typing 6 digits) — this is that code's email,
 * sent through Resend via the Supabase "Send Email" Auth Hook
 * (app/api/auth/send-email-hook/route.ts) instead of Supabase's own default
 * mailer, so it actually matches the brand (AGENTS.md: no plain unstyled
 * emails) and shares the "Minerva Flow <flow@minervaflow.app>" sender
 * identity every other transactional email already uses.
 */
export async function sendCustomerOtpEmail({ to, code }: { to: string; code: string }): Promise<{ ok: boolean }> {
  if (!resend) return { ok: false };

  const digits = code.split("");

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:24px; background-color:#f5f1e6; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1a1e16;">
  <div style="max-width:440px; margin:0 auto; padding:38px 28px; background:#fffefa; border:1px solid #e6e0d0; border-radius:22px; box-shadow:0 8px 24px rgba(26, 30, 22, 0.05); text-align:center;">
    <div style="margin-bottom:20px;">
      <img src="https://minervaflow.app/icon-192.png" width="56" height="56" alt="Minerva Flow" style="display:inline-block; border-radius:15px; box-shadow:0 4px 14px rgba(22,127,91,0.20);" />
    </div>
    <p style="font-size:14.5px; line-height:1.6; color:#4a5245; margin:0 0 22px;">
      Voici votre code de connexion à Minerva Flow — valide 10 minutes.
    </p>
    <div style="display:flex; justify-content:center; gap:8px; margin-bottom:24px;">
      ${digits
        .map(
          (d) =>
            `<span style="display:inline-flex; align-items:center; justify-content:center; width:40px; height:52px; background:#f5f1e6; border:1px solid #dcece3; border-radius:12px; font-family:'JetBrains Mono', ui-monospace, monospace; font-size:24px; font-weight:700; color:#0e5a40;">${d}</span>`
        )
        .join("")}
    </div>
    <p style="margin-top:24px; padding-top:18px; border-top:1px solid #eee9db; font-size:12px; line-height:1.5; color:#8d9488;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel — personne d'autre ne peut se connecter sans ce code.<br />
      © 2026 Minerva Flow · Minerva Technologies Inc.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} — votre code Minerva Flow`,
    html,
  });
  return { ok: !error };
}
