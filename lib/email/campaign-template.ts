const LOGO_URL = "https://www.minervaflow.app/icon-192.png";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Shared editorial shell for product announcement broadcasts. Its layout
 * follows the recent Minerva Flow release emails: centered logo, warm
 * cream page, open rectangular content surface, forest CTA, and a quiet
 * legal/unsubscribe footer. Keep this table-based and inline-styled for
 * consistent rendering in common email clients.
 */
export function renderCampaignAnnouncementEmail(input: {
  title: string;
  eyebrow: string;
  preheader: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const title = escapeHtml(input.title);
  const eyebrow = escapeHtml(input.eyebrow);
  const preheader = escapeHtml(input.preheader);
  const ctaLabel = escapeHtml(input.ctaLabel);
  const ctaUrl = escapeHtml(input.ctaUrl);

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f1e6;font-family:Arial,Helvetica,sans-serif;color:#26372e;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f1e6" style="width:100%;background-color:#f5f1e6;">
    <tr>
      <td align="center" style="padding:30px 14px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffdf7" style="width:100%;max-width:600px;background-color:#fffdf7;">
          <tr>
            <td align="center" style="padding:28px 28px 14px;">
              <img src="${LOGO_URL}" width="42" height="42" alt="Logo Minerva Flow" border="0" style="width:42px;height:42px;border:0;display:block;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 34px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;font-weight:bold;letter-spacing:1.2px;color:#167f5b;text-transform:uppercase;">
              ${eyebrow}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 34px 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:normal;color:#0e5a40;">
              ${title}
            </td>
          </tr>
          <tr>
            <td style="padding:0 34px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:25px;color:#35483e;">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 34px 26px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#0e5a40" style="background-color:#0e5a40;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:#ffffff;text-decoration:none;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f0eee5" style="background-color:#f0eee5;padding:18px 34px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#5b685f;">
              Vous recevez ce message parce que vous avez accepté les communications de Minerva Flow.<br />
              Minerva Technologies Inc.<br />
              367 rue Laberge, Repentigny (Québec) J6A 4C2, Canada<br />
              <a href="https://www.minervaflow.app" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#0e5a40;text-decoration:underline;">minervaflow.app</a><br /><br />
              <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#0e5a40;text-decoration:underline;">Se désabonner des courriels</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
