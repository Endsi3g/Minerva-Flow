import {
  MINERVA_EMAIL_POSTAL_ADDRESS,
  MINERVA_EMAIL_PHONE,
  MINERVA_EMAIL_PHONE_TEL,
  MINERVA_EMAIL_REPLY_TO,
  MINERVA_EMAIL_SITE_URL,
} from "./identity.ts";

const LOGO_URL = `${MINERVA_EMAIL_SITE_URL}/icon-192.png`;

export type MinervaEmailKind = "transactional" | "marketing";

export interface MinervaEmailInput {
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  eyebrow?: string;
  title?: string;
  /** Sets the document title when the content already contains its own heading. */
  documentTitle?: string;
  preheader?: string;
  /** Trusted, already-rendered contextual HTML placed before the legal footer. */
  footer?: string;
  emailKind?: MinervaEmailKind;
  /** Plain text describing why the recipient receives a marketing email. */
  consentReason?: string;
  /** Defaults to Resend's broadcast unsubscribe merge tag for marketing emails. */
  unsubscribeUrl?: string;
  /** Language of the email; French by default. */
  language?: "fr" | "en";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function safeHref(value: string, allowedProtocols: readonly string[]): string {
  const trimmed = value.trim();
  if (/^\{\{\{[A-Z0-9_]+\}\}\}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    return allowedProtocols.includes(url.protocol) ? escapeAttribute(trimmed) : "#";
  } catch {
    return "#";
  }
}

export function renderMinervaEmail(input: MinervaEmailInput): string {
  const language = input.language === "en" ? "en" : "fr";
  const title = input.title ? escapeHtml(input.title) : "";
  const documentTitle = escapeHtml(input.documentTitle ?? input.title ?? "Minerva Flow");
  const eyebrow = input.eyebrow ? escapeHtml(input.eyebrow) : "";
  const preheader = escapeHtml(
    input.preheader ?? input.title ?? input.documentTitle ??
      (language === "en" ? "A message from Minerva Flow." : "Un message de Minerva Flow.")
  );
  const ctaLabel = input.ctaLabel ? escapeHtml(input.ctaLabel) : "";
  const ctaUrl = input.ctaUrl ? safeHref(input.ctaUrl, ["http:", "https:"]) : "";
  const marketing = input.emailKind === "marketing";
  const consentReason = escapeHtml(
    input.consentReason ??
      (language === "en"
        ? "You receive this message because you opted in to Minerva Flow updates."
        : "Vous recevez ce message parce que vous avez accepté les communications de Minerva Flow.")
  );
  const unsubscribeUrl = safeHref(
    input.unsubscribeUrl ?? "{{{RESEND_UNSUBSCRIBE_URL}}}",
    ["http:", "https:", "mailto:"]
  );
  const contextualFooter = input.footer
    ? `<p style="margin:0 0 8px">${input.footer}</p>`
    : "";
  const footer = `${contextualFooter}
    ${marketing ? `<p style="margin:0 0 8px">${consentReason}</p>` : ""}
    <p style="margin:0 0 4px"><strong style="color:#565f52">Minerva Flow</strong> · Minerva Technologies Inc.</p>
    <p style="margin:0 0 6px">${MINERVA_EMAIL_POSTAL_ADDRESS}</p>
    <p style="margin:0"><a href="${MINERVA_EMAIL_SITE_URL}" style="color:#0e5a40;text-decoration:underline">minervaflow.app</a> · <a href="mailto:${MINERVA_EMAIL_REPLY_TO}" style="color:#0e5a40;text-decoration:underline">${MINERVA_EMAIL_REPLY_TO}</a> · <a href="${MINERVA_EMAIL_PHONE_TEL}" style="color:#0e5a40;text-decoration:underline;white-space:nowrap">${MINERVA_EMAIL_PHONE}</a>${
      marketing
        ? ` · <a href="${unsubscribeUrl}" style="color:#0e5a40;text-decoration:underline">${language === "en" ? "Unsubscribe" : "Se désabonner"}</a>`
        : ""
    }</p>`;
  const cta = input.ctaLabel && input.ctaUrl
    ? `<tr><td align="center" style="padding:0 28px 30px"><a class="cta-button" href="${ctaUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background-color:#167f5b;color:#fffefa;text-decoration:none;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:700">${ctaLabel} &rarr;</a></td></tr>`
    : "";

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  ${documentTitle ? `<title>${documentTitle}</title>` : ""}
  <style>
    .font-serif { font-family:'New York','Playfair Display',Georgia,serif !important; }
    @media screen and (max-width:600px) {
      .email-container { width:100% !important; max-width:100% !important; }
      .content-cell { padding:28px 16px 24px !important; }
      .cta-button { display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:28px 14px;background-color:#f5f1e6;color:#25342b;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%">
    <tr><td align="center">
      <table class="email-container" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;margin:0 auto;background-color:#fffefa;border:1px solid #e6e0d0;border-radius:18px;border-collapse:separate;overflow:hidden">
        <tr><td align="center" style="padding:30px 24px 15px"><img src="${LOGO_URL}" width="48" height="48" alt="Minerva Flow" border="0" style="display:block;width:48px;height:48px;border:0;border-radius:14px" /></td></tr>
        ${eyebrow ? `<tr><td style="padding:8px 30px 0;color:#167f5b;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">${eyebrow}</td></tr>` : ""}
        ${title ? `<tr><td style="padding:8px 30px 16px;color:#0e5a40;font-family:'New York','-apple-system-serif','Playfair Display',Georgia,serif;font-size:26px;font-weight:500;line-height:1.25">${title}</td></tr>` : ""}
        <tr><td class="content-cell" style="padding:8px 30px 24px;color:#4a5245;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.75">${input.bodyHtml}</td></tr>
        ${cta}
        <tr><td style="border-top:1px solid #eee9db;padding:17px 24px;color:#818a7d;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:11px;line-height:1.6;text-align:center">${footer}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
