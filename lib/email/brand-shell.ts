const LOGO_URL = "https://minervaflow.app/icon-192.png";

export function renderMinervaEmail(input: {
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  eyebrow?: string;
  title?: string;
  footer?: string;
}): string {
  const brandTitle = input.title
    ? `<h1 style="margin:0 0 14px;color:#173d2d;font-family:'New York',Georgia,serif;font-size:28px;font-weight:500;line-height:1.2">${input.title}</h1>`
    : "";
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 10px;color:#167f5b;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase">${input.eyebrow}</p>`
    : "";
  const cta = input.ctaLabel && input.ctaUrl
    ? `<tr><td align="center" style="padding:5px 32px 30px"><a href="${input.ctaUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background-color:#167f5b;color:#fffefa;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700">${input.ctaLabel} &rarr;</a></td></tr>`
    : "";
  const footer = input.footer ?? "Minerva Flow · Minerva Technologies Inc. · Montréal (Québec), Canada";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:28px 14px;background-color:#f5f1e6;color:#25342b;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background-color:#fffefa;border:1px solid #e6e0d0;border-radius:18px;border-collapse:separate;overflow:hidden">
    <tr><td align="center" style="padding:30px 24px 15px"><img src="${LOGO_URL}" width="48" height="48" alt="Minerva Flow" border="0" style="display:block;width:48px;height:48px;border:0;border-radius:14px"></td></tr>
    <tr><td style="padding:8px 30px 24px">${eyebrow}${brandTitle}<div style="color:#4a5245;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.75">${input.bodyHtml}</div></td></tr>
    ${cta}
    <tr><td align="center" style="border-top:1px solid #eee9db;padding:17px 24px;color:#818a7d;font-size:11px;line-height:1.6">${footer}</td></tr>
  </table>
</body></html>`;
}
