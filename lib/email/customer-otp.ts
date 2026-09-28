import "server-only";
import { Resend } from "resend";
import { renderMinervaEmail } from "@/lib/email/brand-shell";

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

  const digits = code.replace(/\D/g, "").slice(0, 8).split("");
  const cells = digits.map((digit) => `<td align="center" style="width:42px;height:52px;background:#f5f1e6;border:1px solid #dcece3;border-radius:10px;color:#0e5a40;font-family:monospace;font-size:24px;font-weight:700">${digit}</td>`).join('<td width="6"></td>');
  const html = renderMinervaEmail({
    eyebrow: "Connexion sécurisée",
    title: "Votre code de connexion",
    bodyHtml: `<p style="margin:0 0 20px">Entrez ce code dans l’application Minerva Flow. Il reste valide pendant 10 minutes.</p><table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr>${cells}</tr></table><p style="margin:20px 0 0;font-size:12px;color:#818a7d">Si vous n’avez pas demandé ce code, ignorez ce courriel. Personne ne peut se connecter sans lui.</p>`,
    footer: "Minerva Flow · Minerva Technologies Inc.",
  });

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${code} — votre code Minerva Flow`,
    html,
  });
  return { ok: !error };
}
